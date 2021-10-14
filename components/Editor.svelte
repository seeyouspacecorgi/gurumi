<script>
  import nearley from "nearley";
  import grammar from "../scripts/grammar.js";
  import TextArea from "./Inputs/TextArea.svelte";
  export let pattern;
  let input_raw = '';
  let input_styled = '';
  const update = str => {
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(text);
    pattern = parser.results[0];
  };
</script>
<section>
  <TextArea bind:raw={input_raw} bind:styled={input_styled} on:blur={update}/>
</section>
<style>
section {
  display: flex;
  flex-direction: column;
}
</style>
