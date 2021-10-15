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
  <textarea bind:value={raw} spellcheck="false" on:scroll={update_scroll} on:change={update_scroll} on:blur></textarea>
</article>

<style>
  /* TODO: prevent horizontal scrolling */
  article {
    flex:1;
    position: relative;
    border: solid 2px;
    border-radius: var(--ui-radius);
  }
  textarea,
  output {
    padding: 1em;
    overflow-y: auto;
    /* reset */
    line-height: inherit;
    font-size: inherit;
    font-family: inherit;
    white-space: break-spaces;
    box-sizing: border-box;
    margin: 0;
    border-radius: 0;
    outline: none;
    border: none;
  }
  textarea {
    resize: none;
    height: 100%;
    width: 100%;
    background: transparent;
  }
  output {
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    color: transparent;
  }
</style>
