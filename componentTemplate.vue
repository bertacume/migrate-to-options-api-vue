{{{ template }}}

<script lang="ts">
import Vue from 'vue';
import { mapGetters, mapActions } from 'vuex';
{{{ imports }}}
export default Vue.extend({
  name: {{{ name }}},
  {{{ component }}}
  props: {
{{{ props }}}
  },
  data() {
    return {
{{{ data }}}
    };
  },
  computed: {
    ...mapGetters({
{{{ mapGetters }}}
    }),
{{{ computed }}}
  },
  watch: {
{{{ watchers }}}
  },
{{{ lifecycleEvents }}}
  methods: {
    ...mapActions({
{{{ mapActions }}}
    }),    
{{{ methods }}}
  },
})
</script>{{{ style }}}