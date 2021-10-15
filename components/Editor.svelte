<script>
  import nearley from "nearley";
  import grammar from "../scripts/grammar.js";
  import {interpret} from "../scripts/interpretor.js";
  import TextArea from "./Inputs/TextArea.svelte";

  export let pattern;
  let input_raw = '';
  let input_styled = '';
  const syntax = _ => {

    const mark = (txt, _pattern = pattern) => {
      for (let obj of _pattern.reverse()) {
        let regxp = new RegExp(`(?<=(?:^.*$\n){${obj.line|0}}(?:^.{${obj.col-1}}))(.{${obj.offset}})`, 'm');
        if (obj.type === 'repeat') {
          console.log(obj.col, obj.offset, obj.times.length)
          txt = txt.replace(regxp, match => {
            let str = mark(match, obj.stitches.map(st => {return {...st, col: st.col - obj.col + 1}}));
            return `<mark class='${obj.type}'>${str}</mark>`
          });
        } else
          txt = txt.replace(regxp, match => `<mark class='${obj.type}'>${match}</mark>`);
          console.log(txt)
        }
      return txt;
    }

    input_styled = mark(input_raw);
  }

const parse = async _ => {
    console.log("start parse")
    let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(input_raw);
    pattern = await interpret(parser.results[0]);
    syntax();
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
