<template>
  <div class="flex h-full select-none">
    <div v-if="store.wowRootDir" class="w-full flex flex-col items-center bg-brown-900">
      <div class="w-full px-5 py-2 flex items-center space-x-10">
        <ElCheckbox v-model="store.onlyShowLoggedCharacters">只显示登录过的角色</ElCheckbox>

        <ElDropdown placement="bottom" :hide-on-click="false">
          <AppButton type="primary" :icon="Setting"> 覆盖设置 </AppButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem>
                <ElCheckbox v-model="store.overwriteWTFConfig.accountAddon"
                  >账号插件配置</ElCheckbox
                >
              </ElDropdownItem>
              <ElDropdownItem
                ><ElCheckbox v-model="store.overwriteWTFConfig.accountSystem"
                  >账号系统设置</ElCheckbox
                ></ElDropdownItem
              >
              <ElDropdownItem divided>
                <ElCheckbox v-model="store.overwriteWTFConfig.playerAddon">角色插件配置</ElCheckbox>
              </ElDropdownItem>
              <ElDropdownItem>
                <ElCheckbox v-model="store.overwriteWTFConfig.playerSystem"
                  >角色系统设置</ElCheckbox
                >
              </ElDropdownItem>
              <ElDropdownItem>
                <ElCheckbox v-model="store.overwriteWTFConfig.chat">聊天窗口设置</ElCheckbox>
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>

        <AppButton class="ml-5" type="success" :icon="RefreshRight" @click="bus.emit()"
          >刷新</AppButton
        >
      </div>
      <div class="w-full h-full flex items-center justify-center bg-brown-950">
        <div class="flex h-full space-x-5 mt-3">
          <!-- 来源 -->
          <WTFForm
            v-model:flavor="store.selectedSourceFlavor"
            v-model:select="source"
            title="来源角色："
            :flavors="flavors"
          ></WTFForm>

          <div class="flex items-center">
            <AppButton
              type="success"
              size="large"
              :disabled="!source || !target"
              @click="onOverwrite"
              >覆盖 >></AppButton
            >
          </div>

          <!-- 目标 -->
          <WTFForm
            v-model:flavor="store.selectedTargetFlavor"
            v-model:select="target"
            title="目标角色："
            :flavors="flavors"
          ></WTFForm>
        </div>
      </div>
    </div>
    <div v-else class="w-full flex items-center justify-center h-full">
      <RouterLink to="/settings">
        <AppButton type="primary">设置魔兽世界路径</AppButton>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElCheckbox, ElDropdown, ElDropdownItem, ElDropdownMenu, ElMessageBox } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { loadFlavors, flavorToSelector, overwriteCharacterConfig, WTF } from '~/core/wtf'
import { useStore } from '~/store'
import AppButton from '~/components/AppButton.vue'
import { showErrorMessage, showSuccessMessage } from '~/utils/message'
import { useEventBus } from '@vueuse/core'
import WTFForm from '~/components/WTF/WTFForm.vue'
import { RefreshRight, Setting } from '@element-plus/icons-vue'
import { RouterLink } from 'vue-router'

const store = useStore()

const bus = useEventBus<string>('WOW_DIR_CHANGED')

const source = ref<WTF>()
const target = ref<WTF>()

const flavors = ref<{ label: string; value: string }[]>([])

onMounted(() => {
  if (store.checkWoWExists()) {
    load()
  }
  bus.on(load)
})

onUnmounted(() => {
  bus.off(load)
})

const load = async () => {
  const diskFlavors = await loadFlavors()
  flavors.value = diskFlavors.map(flavorToSelector)

  if (!diskFlavors.find(flavor => flavor === store.selectedSourceFlavor)) {
    store.selectedSourceFlavor = diskFlavors[0]
  }

  if (!diskFlavors.find(flavor => flavor === store.selectedTargetFlavor)) {
    store.selectedTargetFlavor = store.selectedSourceFlavor
  }
}

const onOverwrite = () => {
  if (!source.value || !target.value) {
    return
  }

  if (
    source.value.account === target.value.account &&
    source.value.realm === target.value.realm &&
    source.value.name === target.value.name &&
    source.value.flavor === target.value.flavor
  ) {
    showErrorMessage('来源角色和目标角色不能相同')
    return
  }

  ElMessageBox.confirm(
    `确定使用 "${source.value.name} - ${source.value.realm}" 覆盖 "${target.value.name} - ${target.value.realm}" 的配置吗`,
    '操作确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      if (!store.checkWoWExists()) {
        showErrorMessage('请先设置魔兽世界路径')
        return
      }
      try {
        await overwriteCharacterConfig(source.value!, target.value!)
        showSuccessMessage('覆盖成功')
      } catch (e) {
        showErrorMessage('覆盖失败')
      }
    })
    .catch(() => {})
}
</script>
