<script>
  import nearley from "nearley";
  import grammar from "../scripts/grammar.js";
  import {interpret} from "../scripts/interpretor.js";
  import TextArea from "./Inputs/TextArea.svelte";

  export let pattern;
  let input_raw = '';
  let input_styled = '';
const parse = async _ => {
    console.log("start parse")
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(input_raw);
    pattern = await interpret(parser.results[0]);
  };
</script>
<section>
  <TextArea bind:raw={input_raw} bind:styled={input_styled} on:blur={parse}/>
</section>
<style>
  section {
    display: flex;
    flex-direction: column;
  }
</style>
