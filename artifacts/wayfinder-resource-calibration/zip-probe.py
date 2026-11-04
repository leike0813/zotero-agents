# THROWAWAY stdlib ZIP resource probe. Not production archive/Host acceptance.
from __future__ import annotations
import base64
import gc
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import random
import re
import resource
import shutil
import signal
import struct
import sys
import tempfile
import time
import zipfile

MiB, GiB = 2**20, 2**30
RESERVE, RSS_LIMIT, RATE = 8*GiB, 256*MiB, 256*MiB
scratch, case = Path(sys.argv[1]), sys.argv[2]
assert scratch.name.startswith('zotero-budget-prototype-') and not scratch.is_symlink()
configs = {
    'small': (32, MiB, zipfile.ZIP_DEFLATED),
    'topic': (256, 50*MiB, zipfile.ZIP_DEFLATED),
    'research': (5000, 2*GiB, zipfile.ZIP_STORED),
    'archive': (20000, 16*GiB, zipfile.ZIP_STORED),
    'names': (20000, 20000, zipfile.ZIP_STORED),
    'unsafe': (1, 1, zipfile.ZIP_STORED),
    'overcount': (20001, 0, zipfile.ZIP_STORED),
    'cancel': (256, 50*MiB, zipfile.ZIP_DEFLATED),
}
assert case in configs
count, total, compression = configs[case]
assert shutil.disk_usage(scratch).free > 2*total + 256*MiB + RESERVE
own = Path(tempfile.mkdtemp(prefix=f'zip-{case}-', dir=scratch))
token = os.urandom(16).hex()
marker = own/'.owner'
marker.write_text(token)
archive, stage, old = own/'source.zip', own/'staging', own/'old-target'
old.write_bytes(b'PROTOTYPE OLD CONTENT')
started = time.monotonic()
metrics = {'evidenceLayer': 'throwaway-resource-prototype', 'case': case,
    'declaredEntries': count, 'declaredPayloadBytes': total,
    'compression': 'stored' if compression == zipfile.ZIP_STORED else 'deflated',
    'rateCapBytesPerSecond': RATE, 'baselineRssBytes': 0,
    'peakRssBytes': 0, 'peakOwnedFileAllocatedBytes': 0, 'peakOwnedFileLogicalBytes': 0}
closed_alloc = closed_logical = 0
expected, directories = {}, set()

def watermark():
    text = Path('/proc/self/status').read_text()
    return int(re.search(r'^VmHWM:\s+(\d+)', text, re.M)[1])*1024

metrics['baselineRssBytes'] = watermark()

def disk_sample(current=None):
    allocated, logical = closed_alloc, closed_logical
    for p in (archive, current):
        if p is not None and p.exists():
            s = p.stat()
            allocated += s.st_blocks*512
            logical += s.st_size
    for p in directories:
        if p.exists(): allocated += p.stat().st_blocks*512
    metrics['peakOwnedFileAllocatedBytes'] = max(metrics['peakOwnedFileAllocatedBytes'], allocated)
    metrics['peakOwnedFileLogicalBytes'] = max(metrics['peakOwnedFileLogicalBytes'], logical)

def guard():
    metrics['peakRssBytes'] = max(metrics['peakRssBytes'], watermark())
    assert metrics['peakRssBytes'] < RSS_LIMIT, 'VmHWM memory ceiling'
    assert shutil.disk_usage(scratch).free > RESERVE, 'free disk reserve'
    assert time.monotonic()-started < 600, 'case deadline'


def sizes():
    if case in ('topic', 'cancel'):
        first, rest = 5*MiB, count-1
        q, r = divmod(total-first, rest)
        return [first]+[q+(i<r) for i in range(rest)]
    if case == 'research':
        q, r = divmod(total-GiB, count-1)
        return [GiB]+[q+(i<r) for i in range(count-1)]
    if case == 'archive':
        tiny = count-8
        q, r = divmod(total-tiny, 8)
        return [q+(i<r) for i in range(8)]+[1]*tiny
    q, r = divmod(total, count)
    return [q+(i<r) for i in range(count)]


def entry_name(i):
    if case == 'unsafe': return '../escape.bin'
    if case == 'names':
        component = '文'*29+'😀'
        return '/'.join([component]*31+[f'{i:05d}-'+'文'*26])
    return f'payload/entry-{i:05d}.bin'


def validate(infos):
    assert len(infos) <= 20000, 'entry count limit'
    seen, summed = set(), 0
    for info in infos:
        name = info.filename.replace('\\', '/')
        parts = PurePosixPath(name).parts
        assert not name.startswith('/') and not re.match(r'^[A-Za-z]:', name), 'absolute path'
        assert parts and all(p not in ('.', '..') for p in parts), 'path traversal'
        assert name not in seen, 'duplicate path'
        seen.add(name)
        assert len(name.encode('utf-16-le'))//2 <= 1024 and len(parts) <= 64, 'path budget'
        assert info.file_size <= 2*GiB, 'entry bytes limit'
        summed += info.file_size
        assert summed <= 16*GiB, 'aggregate bytes limit'
    return summed


def stop(_signal, _frame):
    raise RuntimeError('external interruption')

signal.signal(signal.SIGTERM, stop)
block = random.Random(0x13579bdf).randbytes(MiB)
if case in ('topic', 'cancel'): block = base64.b64encode(block)
metrics['pattern'] = 'seeded repeating block larger than deflate window; synthetic bytes, not business-valid bundle'
metrics['blockSha256'] = hashlib.sha256(block).hexdigest()
error = None
outcome = 'failed'
try:
    guard()
    create_started = time.monotonic()
    produced = 0
    with zipfile.ZipFile(archive, 'w', compression=compression, allowZip64=True) as zf:
        for i, size in enumerate(sizes()):
            info = zipfile.ZipInfo(entry_name(i), (2026, 1, 1, 0, 0, 0))
            info.compress_type, info.file_size = compression, size
            digest = hashlib.sha256()
            with zf.open(info, 'w', force_zip64=True) as sink:
                remaining = size
                while remaining:
                    chunk = memoryview(block)[:min(len(block), remaining)]
                    sink.write(chunk)
                    digest.update(chunk)
                    remaining -= len(chunk)
                    produced += len(chunk)
                    pause = produced/RATE - (time.monotonic()-create_started)
                    if pause > 0: time.sleep(pause)
                    if produced % (32*MiB) < len(chunk): guard(); disk_sample()
            expected[info.filename] = digest.hexdigest()
    del zf
    gc.collect()
    with archive.open('rb') as f: os.fsync(f.fileno())
    metrics['createSeconds'] = time.monotonic()-create_started
    metrics['archiveBytes'] = archive.stat().st_size
    metrics['containerOverheadBytes'] = metrics['archiveBytes']-total
    metrics['longestNameUtf8Bytes'] = max(len(n.encode()) for n in expected)
    metrics['longestNameUtf16Units'] = max(len(n.encode('utf-16-le'))//2 for n in expected)
    disk_sample(); guard()
    extract_started = time.monotonic()
    extracted = extracted_count = 0
    with zipfile.ZipFile(archive) as zf:
        infos = zf.infolist()
        try:
            assert validate(infos) == total
        except AssertionError as e:
            assert case in ('unsafe', 'overcount'), str(e)
            metrics['preflightRejection'] = str(e)
            outcome = 'preflight_rejection'
        else:
            assert case not in ('unsafe', 'overcount')
            stage.mkdir(); directories.add(stage)
            for info in infos:
                target = stage.joinpath(*PurePosixPath(info.filename).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                p = target.parent
                while p != own:
                    directories.add(p)
                    p = p.parent
                digest = hashlib.sha256()
                with zf.open(info) as src, target.open('xb') as sink:
                    while chunk := src.read(MiB):
                        sink.write(chunk); digest.update(chunk); extracted += len(chunk)
                        if case == 'cancel' and extracted >= 8*MiB:
                            raise InterruptedError('planned extract interruption')
                        pause = extracted/RATE-(time.monotonic()-extract_started)
                        if pause > 0: time.sleep(pause)
                        if extracted % (32*MiB) < len(chunk): guard(); disk_sample(target)
                    sink.flush(); os.fsync(sink.fileno())
                assert digest.hexdigest() == expected[info.filename], 'extracted digest mismatch'
                assert target.stat().st_size == info.file_size
                closed_alloc += target.stat().st_blocks*512
                closed_logical += target.stat().st_size
                extracted_count += 1
            assert extracted == total and extracted_count == count
            disk_sample(); guard()
            outcome = 'complete'
    metrics['extractSeconds'] = time.monotonic()-extract_started
    metrics['extractedBytes'] = extracted
    metrics['extractedEntries'] = extracted_count
except InterruptedError as e:
    assert case == 'cancel'
    metrics['interruption'] = str(e)
    metrics['extractedBytesBeforeCancel'] = extracted
    disk_sample(target)
    outcome = 'extract_interrupted'
except BaseException as e:
    error = {'type': type(e).__name__, 'message': str(e)}
finally:
    metrics['oldTargetPreserved'] = old.read_bytes() == b'PROTOTYPE OLD CONTENT'
    assert metrics['oldTargetPreserved']
    metrics['peakRssBytes'] = max(metrics['peakRssBytes'], watermark())
    metrics['rusageMaxRssDiagnosticKiB'] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    assert marker.read_text() == token
    shutil.rmtree(own)
    metrics['cleanupComplete'] = not own.exists()
metrics.update(outcome=outcome, error=error, elapsedSeconds=time.monotonic()-started,
    peakMemorySource='Linux /proc/self/status VmHWM',
    diskAccounting='observed owned file st_blocks plus extracted directories; excludes journal and system page cache',
    fsync='archive and extracted file data; directory fsync not measured',
    limits='Linux stdlib ZIP prototype only; no real Host, business validation or remote proof')
print(json.dumps(metrics))
if error: raise SystemExit(1)
