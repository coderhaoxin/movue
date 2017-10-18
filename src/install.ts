import VueClass from 'vue'

export interface IMobxMethods {
  reaction: any
}

export type Disposer = () => void

declare module 'vue/types/options' {
  interface ComponentOptions<V extends VueClass> {
    fromMobx?: { [key: string]: (this: V) => any }
  }
}

export default function install(Vue: typeof VueClass, mobxMethods: IMobxMethods) {

  const defineReactive = (Vue as any).util.defineReactive

  function beforeCreate(this: VueClass) {
    const vm = this
    getFromStoreEntries(vm).forEach(({ key, compute }) => {
      defineReactive(vm, key, null, null, true)
    })
  }

  function created(this: VueClass) {
    const vm = this
    const entries = getFromStoreEntries(vm)
    if (entries.length <= 0) {
      return
    }

    const disposers: Disposer[] = vm['__movueDisposers__'] = []

    entries.forEach(({ key, compute }) => {
      const collect = () => compute.apply(vm)
      const update = val => vm[key] = val
      disposers.push(mobxMethods.reaction(collect, update, true))
      vm.$watch(collect, update)
    })
  }

  function beforeDestroy(this: VueClass) {
    const vm = this
    const disposers: Disposer[] = vm['__movueDisposers__']
    if (disposers) {
      disposers.forEach(
        dispose => dispose()
      )
    }
  }

  Vue.mixin({
    beforeCreate,
    created,
    beforeDestroy
  })
}

function getFromStoreEntries(vm: VueClass) {
  const fromStore = vm.$options.fromMobx
  if (!fromStore) {
    return []
  }

  return Object.keys(fromStore).map(
    key => ({ key, compute: fromStore[key] })
  )
}
