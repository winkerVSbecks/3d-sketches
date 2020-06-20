<script>
  import { onMount } from 'svelte';
  import queryString from 'query-string';
  import Toolbar from './Toolbar.svelte';
  import { resize } from './resize';

  const sketches = [
    'rlrr-red',
    'unholy-155',
    'some-caterpillars-stay-caterpillars',
  ];

  let activeSketch = 0;
  let sketch;
  let name;
  let embedElement;

  onMount(() => {
    const params = queryString.parse(location.search);
    if (params.sketch) {
      const selection = sketches.findIndex(
        (sketch) => sketch === params.sketch
      );

      activeSketch = selection >= 0 ? selection : activeSketch;
    }

    selectSketch();
    resize(embedElement);
    window.addEventListener('resize', () => resize(embedElement));
  });

  function selectSketch() {
    sketch = sketches[activeSketch];
    name = sketch.replace(/-/g, ' ');
  }

  function refresh() {
    embedElement.contentWindow.location.reload(true);
  }

  function handleClick(type) {
    return () => {
      if (type === 'previous') {
        activeSketch -= 1;
      } else if (type === 'next') {
        activeSketch += 1;
      }

      if (activeSketch < 0) {
        activeSketch = sketches.length - 1;
      } else if (activeSketch > sketches.length - 1) {
        activeSketch = 0;
      }

      location.search = queryString.stringify({
        sketch: sketches[activeSketch],
      });

      selectSketch();
    };
  }
</script>

<main>
  <iframe bind:this="{embedElement}" src="sketches/{sketch}"></iframe>
  <Toolbar
    name="{name}"
    selectSketch="{selectSketch}"
    refresh="{refresh}"
    handleClick="{handleClick}"
  ></Toolbar>
</main>

<style>
  main {
    max-width: 600px;
    width: 100%;
  }

  iframe {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    border: 0;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 0;
    transition: all 0.2s linear;
    border-radius: 5px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0px 10px 10px rgba(0, 0, 0, 0.05);
  }
</style>
