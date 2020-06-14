<script>
  export let name;
  export let selectSketch;
  export let refresh;
  export let handleClick;
</script>

<header>
  <h1>{name}</h1>
  <div class="spacer"></div>
  <button on:click="{refresh}">
    <svg
      aria-label="refresh"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="feather feather-rotate-cw"
    >
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>
  </button>
  <button on:click="{handleClick('previous')}">
    <svg
      aria-label="previous"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  </button>
  <button on:click="{handleClick('next')}">
    <svg
      aria-label="next"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  </button>
</header>

<style>
  header {
    margin-top: 1rem;
    display: flex;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-size: 0.875rem;
    text-transform: uppercase;
  }

  .spacer {
    flex: 1 1 auto;
  }

  button:last-child {
    margin-left: 0.5rem;
  }

  svg {
    vertical-align: middle;
  }
</style>
