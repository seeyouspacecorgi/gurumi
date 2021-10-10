<script>
  import { colors } from "../../store.js";
  const set_color = evt => {
    //TODO :sanitize input, check for duplicates;
    console.log("foo");
  };
</script>

<section>
  {#each $colors.entries as [key, value], i}
    <button style='background:{value}'>{key}</button>

  {/each}
</section>