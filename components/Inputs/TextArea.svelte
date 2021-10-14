<script>
  export let raw = '';
  export let styled = '';
  let output;

  const update_scroll = evt => {
    output.scrollTo(evt.target.scrollLeft,evt.target.scrollTop)
  }

</script>

<article>
  <output bind:this={output}>{@html styled}<br/></output>
  <textarea bind:value={raw} spellcheck="false" wrap="soft" on:scroll={update_scroll} on:change={update_scroll}></textarea>
</article>

<style>
  /* TODO: prevent horizontal scrolling */
  article {
    border: solid 2px;
    position: relative;
    flex:1;
    font-family: var(--font-highlight);
  }
  textarea, output {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    border-radius: 0;
    outline: none;
    border: none;
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
    height: 100%;
    vertical-align: bottom;
    white-space: pre;
    word-wrap: break-word;
  }
  textarea {
    resize: none;
    line-height: inherit;
    font-size: inherit;
    font-family: inherit;
    background: transparent;
  }
  output {
    position: absolute;
    z-index: -1;
    color: transparent;
  }
</style>
