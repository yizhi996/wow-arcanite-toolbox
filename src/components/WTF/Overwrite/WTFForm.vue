<template>
  <div class="flex flex-col space-y-3 h-full">
    <span class="flex items-center"
      ><span>{{ title }}</span>
      <span v-if="select" class="font-semibold"
        ><span :style="{ color: select.classColor }">{{ select.name }}</span> -
        {{ select.realm }}</span
      >
    </span>

    <div class="flex space-x-2">
      <ElSelect style="width: 220px" :model-value="flavor" @change="onFlavorChange">
        <ElOption v-for="item in flavors" :key="item.value" :label="item.label" :value="item.value">
          <div class="flex items-center justify-between">
            <span>{{ item.label }}</span>
            <span class="text-white/50 text-xs">
              {{ item.value }}
            </span>
          </div>
        </ElOption>
      </ElSelect>

      <ElInput v-model.trim="searchCharacterName" placeholder="搜索角色名" :prefix-icon="Search" />
    </div>

    <ElTable
      :border="true"
      style="height: calc(100% - 96px)"
      :data="filterCharacters"
      highlight-current-row
      @current-change="onSelectChange"
    >
      <ElTableColumn property="name" label="角色">
        <template #default="scope">
          <span class="flex items-center">
            <slot name="left"></slot>
            <span :style="{ color: scope.row.classColor }">{{ scope.row.name }}</span>
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn property="realm" label="服务器" />
      <ElTableColumn property="account" label="子账号" />
    </ElTable>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { ElInput, ElOption, ElSelect, ElTable, ElTableColumn } from 'element-plus'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Flavor, loadWTFCharacters, WTF } from '~/core/wtf'
import { SelectOption } from '~/utils'
import { useStore } from '~/store'
import { useEventBus } from '@vueuse/core'

const props = defineProps<{
  title: string | undefined
  select: WTF | undefined
  flavor: Flavor | string
  flavors: SelectOption[]
  sort?: (values: WTF[]) => WTF[]
}>()

const emit = defineEmits<{
  'update:flavor': [value: Flavor | string]
  'update:select': [value: WTF | undefined]
}>()

const store = useStore()

const bus = useEventBus<string>('WOW_DIR_CHANGED')

const characters = ref<WTF[]>([])

const searchCharacterName = ref('')

const filterCharacters = computed(() => {
  let res = characters.value
  if (store.onlyShowLoggedCharacters) {
    res = characters.value.filter(character => character.logged)
  }
  if (searchCharacterName.value) {
    const lowerCaseName = searchCharacterName.value.toLowerCase()
    res = res.filter(character => character.name.toLowerCase().includes(lowerCaseName))
  } else if (res.length > store.WTF_LIST_LIMIT) {
    res = res.slice(0, store.WTF_LIST_LIMIT)
  }
  return res
})

onMounted(async () => {
  loadCharacters()
  bus.on(loadCharacters)
})

onUnmounted(() => {
  bus.off(loadCharacters)
})

const onSelectChange = (val: WTF | undefined) => {
  emit('update:select', val)
}

const onFlavorChange = async (val: string) => {
  emit('update:flavor', val)
  const res = await loadWTFCharacters(val)
  characters.value = props.sort ? props.sort(res) : res
}

const loadCharacters = async () => {
  if (props.flavor) {
    const res = await loadWTFCharacters(props.flavor)
    characters.value = props.sort ? props.sort(res) : res
  } else {
    characters.value = []
  }
}
</script>
