<script>
  import nearley from "nearley";
  import grammar from "../scripts/grammar.js";
  import { interpret } from "../scripts/interpretor.js";
  import TextArea from "./Inputs/TextArea.svelte";

  export let pattern;
  let input_raw = '';
  let input_styled = '';
  let error = '';

  const makepretty = _ => {
    if (!pattern) return;

    let arr = input_raw.split(/\n/);

    const markAt = (str, col, lgth, cls) => {
      let regxp = new RegExp(`(?<=(?:^.{${col-1}}))(.{${lgth}})`);
      return str.replace(regxp, match => `<mark class='${cls}'>${match}</mark>`);
    }

    pattern.forEach((row, i) => { //Could be imrpoved by using row line number
      const markOps = (ops, str) => ops.reverse().reduce((all, op) => {
        if(op.type === 'repeat') {
          //Mark string for repeat.operations first
          let sub_ops = markOps(op.operations, all);
          //Then add the new length of the string to the repeat offset
          return markAt(sub_ops, op.col, op.offset + (sub_ops.length - all.length), op.type);
        }
        return markAt(all, op.col, op.offset, op.type);
      }, str||arr[i]);
      let ops = markOps(row.operations);
      //Wrap line and add stitch count to css
      arr[i] = `<span style='--sts:"${row.after}"'>${ops}</span>`
    });

    input_styled = arr.join('');
  }

  const parse = async _ => {
    console.log("start parse")
    error = '';
    try {
      let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
      parser.feed(input_raw);
      pattern = await interpret(parser.results[0]);
    } catch (err) {
      error = 'Invalid syntax : the parser is confused';
    } finally {
      makepretty();
    }
    console.log(pattern);
  };

</script>

<section>
  <TextArea bind:raw={input_raw} bind:styled={input_styled} on:input={parse}/>
  <ErrorBox text={error}/>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
  }
</style>
