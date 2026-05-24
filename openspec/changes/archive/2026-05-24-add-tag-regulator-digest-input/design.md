## Design

The workflow resolves digest context during `buildRequest`, after the parent item is resolved and before the SkillRunner request is returned.

The resolver is package-local to `tag-vocabulary-package` so tag workflows do not import private modules from `literature-workbench-package`. It implements only the current digest payload storage rule:

- inspect child notes of the selected parent;
- select notes recognizable as generated digest notes;
- inspect note child attachments;
- parse attachments containing `ZS_WORKBENCH_NOTE_PAYLOAD_V1:` envelopes;
- accept only envelopes with `payloadType: "digest-markdown"`;
- return non-empty `payload.content`.

When markdown is resolved, the workflow writes it to a temporary `.md` file and adds a second upload file with key `digest_markdown`. The SkillRunner request references it through `input.digest_markdown`. Optional digest resolution failures are ignored so existing tag regulation remains available.

This change deliberately does not scan ordinary attachments, extract visible note HTML, or add workflow parameters. The only supported automatic source is the current workbench embedded payload attachment.
