<template>
  <div>
    <h1 class="title">LIST</h1>
    <p v-if="subtitle">{{ subtitle }}</p>
    <div v-if="isListempty">
      <input type="text" @keyup.enter="addTodo"/>
      <List :items="todos" @toggleItem="toggleTodo" />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Action, Getter } from 'nuxt-property-decorator';
import { Todo } from '~/type.ts';
import { todoMixin } from '~/mixins/todoMixin';

@Component({
  layout: '',
  components: {
    List: () => import('~/components/List.vue'),
  },
  mixins: [todoMixin],
  middleware: 'auth',
})
export default class TodoList extends Vue {
  @Prop({ default: 'primary' }) theme;
  @Prop({
    
  }) subtitle: string;
  @Prop({
    type: String,
    required: true,
  }) longProp: string;
  @Getter('account/loggedIn') isLoggedIn: boolean;
  @Action('breadcrumbs/overrideBreadcrumbs') breadcrumbs;

  todos: Array<Todo> = [];
  newTodo: Todo = {};

  get isListempty () {
    return this.todos.length;
  }

  addTodo() {
    this.todos = [...this.todos, this.newTodo];
  }

  toggleTodo () {
    // ...
  }

  async asyncData() {
    console.log('asyncData')
  }

  destroyed() {
    console.log('destroy')
  }

  beforeCreate() {
    console.log('beforeCreate')
  }

  get bye() {
    const num = { hello: 'hello' };
    // const num = 2;
    return num;
  }

  async handleEvent() {
    // f
  }
}

// ignore this

// ....
// ....
//  ....
//  ....
//  ....
//  ....
</script>

<style scoped>
div {
  color: black;
}
</style>
