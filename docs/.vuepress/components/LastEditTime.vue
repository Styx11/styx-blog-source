<template>
  <div id="last_edit_time" v-if='ready'>
    <span class="last_time_text">上次更新: </span>
    <span class="last_time">{{ lastEditTime }}</span>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    filepath: {
      type: String,
      required: true,
    }
  },
  // baseCommitApi is github api that can provide commit information including last update time
  // more details: https://developer.github.com/v3/repos/commits/
  data: () => ({
    ready: false,
    lastEditTime: '',
    baseCommitApi: 'https://api.github.com/repos/styx11/styx-blog-source/commits?path=docs/blog/',
  }),
}
</script>

<style>
#app > div.theme-container > main > div {
  position: relative;
}
#last_edit_time {
  display: inline-block;
  overflow: hidden;
  position: absolute;
  right: 2.5rem;
  bottom: -0.8rem;
}
#last_edit_time > span.last_time_text {
  color: #546E8B !important;
  font-size: 1rem;
  font-weight: bold;
}
#last_edit_time > span.last_time {
  color: #acacac;
  font-size: 1rem;
}
</style>