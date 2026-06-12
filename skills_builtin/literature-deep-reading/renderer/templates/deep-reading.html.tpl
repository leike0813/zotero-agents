<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{TITLE}}</title>
    <style>
      {{STYLE}}
    </style>
  </head>
  <body class="mode-compare">
    <script id="deep-reading-data" type="application/json">
      {{DATA_JSON}}
    </script>
    <header class="topbar">
      <div class="brand">
        <strong data-paper-title></strong>
        <span data-paper-meta></span>
      </div>
      <nav class="modes" aria-label="阅读模式">
        <button type="button" data-mode="original">原文</button>
        <button type="button" data-mode="translated">译文</button>
        <button type="button" data-mode="compare">对照</button>
        <button type="button" data-mode="focus">专注</button>
      </nav>
    </header>
    <div class="shell">
      <aside
        class="concept-rail"
        data-concept-rail
        aria-label="概念导航"
      ></aside>
      <nav class="toc" data-nav data-toc aria-label="论文目录"></nav>
      <main class="paper-scroll" data-paper-scroll>
        <section class="preface-section" data-preface></section>
        <article class="paper markdown-body" data-paper></article>
        <article class="reading-flow markdown-body" data-reading-flow></article>
        <article class="translation-paper" data-translation-paper></article>
        <section class="summary-section" data-summary></section>
        <section class="post-reading" data-post-reading></section>
        <section class="citation-graph-section" data-citation-graph></section>
        <section class="extensions" data-extensions></section>
      </main>
      <aside class="side reading-aid" data-side data-reading-aid></aside>
    </div>
    <div class="digest-modal" data-digest-modal hidden></div>
    <script>{{SCRIPT}}</script>
  </body>
</html>
