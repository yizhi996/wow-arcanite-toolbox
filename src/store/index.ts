import { defineStore } from 'pinia'
import { ref, reactive, watch, computed } from 'vue'
import { useAppStorage } from '~/composables/useAppStorage'
import { existsSync } from 'node:fs'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { resolve, dirname, join } from 'node:path'
import { Flavor } from '~/core/wtf'

export const useStore = defineStore('main', () => {
  const router = useRouter()

  const appInfo = reactive({
    paths: {
      appData: '',
      userData: ''
    },
    version: ''
  })

  const wowRootDir = useAppStorage('wowRootDir', '')

  const selectedSourceFlavor = useAppStorage('selectedSourceFlavor', '')
  const selectedTargetFlavor = useAppStorage('selectedTargetFlavor', '')

  const WTF_PATH = (flavor: Flavor | string) => {
    return resolve(wowRootDir.value, flavor, 'WTF')
  }

  const ACCOUNT_PATH = (flavor: Flavor | string) => {
    return resolve(WTF_PATH(flavor), 'Account')
  }

  const checkWoWExists = () => {
    if (!wowRootDir.value) {
      return false
    }
    return existsSync(wowRootDir.value)
  }

  const showWowDirSetAlert = () => {
    ElMessageBox.alert('请设置魔兽世界所在目录', '设置', {
      confirmButtonText: '前往',
      callback: (action: string) => {
        if (action === 'confirm') {
          router.push('/settings')
        }
      }
    })
  }

  return {
    appInfo,
    wowRootDir,
    selectedSourceFlavor,
    selectedTargetFlavor,
    WTF_PATH,
    ACCOUNT_PATH,
    checkWoWExists,
    showWowDirSetAlert
  }
})
