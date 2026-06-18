<!doctype html>
<html lang="{{HTML_LANG}}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{TITLE}}</title>
    <style>
      {{STYLE}}
    </style>
  </head>
  <body class="{{BODY_CLASS}}">
    <script id="deep-reading-data" type="application/json">
      {{DATA_JSON}}
    </script>
    <header class="topbar">
      <div class="brand">
        <strong data-paper-title>{{PAPER_TITLE}}</strong>
        <span data-paper-meta>{{PAPER_META}}</span>
      </div>
      <div class="zotero-viewer-warning" data-zotero-viewer-warning>
        {{STATIC_VIEWER_WARNING}}
      </div>
      <nav class="modes" aria-label="阅读模式">
        <button type="button" data-mode="original">原文</button>
        <button type="button" data-mode="translated">译文</button>
        <button type="button" data-mode="compare">对照</button>
        <button type="button" data-mode="focus">专注</button>
      </nav>
    </header>
    <noscript>
      <div class="zotero-viewer-warning is-static">
        {{STATIC_NOSCRIPT_WARNING}}
      </div>
    </noscript>
    <div class="shell">
      <aside class="concept-rail" data-concept-rail aria-label="概念导航">
        {{STATIC_CONCEPT_RAIL}}
      </aside>
      <nav class="toc" data-nav data-toc aria-label="论文目录">
        {{STATIC_NAV}}
      </nav>
      <main class="paper-scroll" data-paper-scroll>
        <section class="preface-section" data-preface>
          {{STATIC_PREFACE}}
        </section>
        <article class="paper markdown-body" data-paper>
          {{STATIC_SOURCE_READING}}
        </article>
        <article class="reading-flow markdown-body" data-reading-flow>
          {{STATIC_COMPARE_READING}}
        </article>
        <article class="translation-paper" data-translation-paper>
          {{STATIC_TRANSLATION_READING}}
        </article>
        <section class="summary-section" data-summary>
          {{STATIC_SUMMARY}}
        </section>
        <section class="post-reading" data-post-reading>
          {{STATIC_POST_READING}}
        </section>
        <section class="appendix-section" data-appendix-reading>
          <article
            class="paper appendix-paper markdown-body"
            data-appendix-paper
          >
            {{STATIC_APPENDIX_SOURCE}}
          </article>
          <article
            class="reading-flow appendix-reading-flow markdown-body"
            data-appendix-reading-flow
          >
            {{STATIC_APPENDIX_COMPARE}}
          </article>
          <article
            class="translation-paper appendix-translation-paper"
            data-appendix-translation-paper
          >
            {{STATIC_APPENDIX_TRANSLATION}}
          </article>
        </section>
        <section class="citation-graph-section" data-citation-graph>
          {{STATIC_CITATION_GRAPH}}
        </section>
        <section class="extensions" data-extensions>
          {{STATIC_EXTENSIONS}}
        </section>
      </main>
      <aside class="side reading-aid" data-side data-reading-aid>
        {{STATIC_READING_AID}}
      </aside>
    </div>
    <div class="paper-digest-modal" data-digest-modal hidden></div>
    <script>{{SCRIPT}}</script>
  </body>
</html>
