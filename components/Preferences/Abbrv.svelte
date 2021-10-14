<script>
  import { abbrv } from "../../scripts/store.js";
  const set_abbrv = evt => {
    //TODO :sanitize input, check for duplicates;
    $abbrv.set(evt.target.name, evt.target.value);
  };
</script>

<section>
  <p> Here are the standard abbreviations used by the app, but feel free to  input your own.</p>
  <img alt=''/>
  <div>
    <select name="conventions">
      <option value="">--Use standard notation--</option>
    </select>
    <table>
    {#each $abbrv.entries as [key, value], i}
      <tr>
        <label for={i}>{key}</label>
        <input type='text' id={i} name={key} value={value} on:change={set_abbrv}/>
      </tr>
    {/each}
    </table>
  </div>
</section>

<style>
  section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
  }
  p {
    grid-column: span 2;
  }
</style>
