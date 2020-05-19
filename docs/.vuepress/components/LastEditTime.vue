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
  computed: {
    completeCommitApi () {
      let path = this.filepath;
      if (path.indexOf('/') === 0) path = path.substring(1);
      return this.baseCommitApi + path;
    }
  },
  mounted () {
    // 因为使用场景有限，所以忽略了一些错误处理
    axios.get(this.completeCommitApi)
      .then(res => {
        if (!res || res.status !== 200) return;
        const { data } = res;
        const lastCommit = (!!data[0].commit) && data[0].commit;
        const lastCommitter = (!!lastCommit.committer) && lastCommit.committer;
        const lastCommitDate = (!!lastCommit.committer.date) && lastCommit.committer.date;
        if (!lastCommitDate) return;

        // convert date i.e 2020-05-17T08:31:38Z into 2020-05-17, 16:31:38 PM
        let lastEditTime = '';
        const lastDate = new Date(lastCommitDate);
        const year = lastDate.getFullYear();
        const day = this.formatTime(lastDate.getDate());
        const month = this.formatTime((lastDate.getMonth() + 1) % 12);
        lastEditTime += `${year}-${month}-${day}, `;

        const hour = this.formatTime(lastDate.getHours());
        const second = this.formatTime(lastDate.getSeconds());
        const minutes = this.formatTime(lastDate.getMinutes());
        lastEditTime += `${hour}:${minutes}:${second} ${hour < 12 ? 'AM' : 'PM'}`;

        this.lastEditTime = lastEditTime;
        this.ready = true;
      }).catch(e => {
        console.error(e);
        this.ready = false;
      });
  },
  methods: {
    // format date(second. hour...) into XX
    formatTime (date) {
      return date < 10 ? `0${date}` : date;
    }
  }
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