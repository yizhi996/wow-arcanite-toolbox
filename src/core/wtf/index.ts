import { resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { readFile, writeFile } from 'node:fs/promises'
import { useStore } from '~/store'
import { fs_readdir } from '~/utils/fs'
import {
  classColorFromIndex,
  classNameToIndex,
  getClassCharacterMapFromElvUI,
  getClassCharacterMapFromNDui,
  getClassIndexFromYishier
} from './classes'
import { checkWoWExists, getAccountPath } from '~/utils/path'

export interface WTF {
  account: string
  realm: string
  name: string
  flavor: Flavor | string
  classColor: string
  logged: boolean
  editDate: number
}

export const enum Flavor {
  RETAIL = '_retail_',
  CLASSIC = '_classic_',
  XPTR = '_xptr_',
  CLASSIC_ERA = '_classic_era_'
}

const FLAVOR_NAMES = {
  [Flavor.RETAIL]: '正式服',
  [Flavor.CLASSIC]: '怀旧服',
  [Flavor.XPTR]: '测试服',
  [Flavor.CLASSIC_ERA]: '经典旧世'
}

const FILENAME_SAVED_VARIABLES = 'SavedVariables'

export const loadFlavors = async (root?: string) => {
  const store = useStore()
  const rootDir = root || store.wowRootDir
  const dirs = await fs_readdir(rootDir)
  const result: Flavor[] = []
  for await (const dir of dirs) {
    const s = await stat(resolve(rootDir, dir))
    if (s.isDirectory() && dir.startsWith('_') && dir.endsWith('_')) {
      result.push(dir as Flavor)
    }
  }
  result.sort((a, b) => {
    if (a === Flavor.RETAIL) {
      return -1
    }
    if (b === Flavor.RETAIL) {
      return 1
    }
    return 0
  })
  return result
}

export const flavorToSelector = (flavor: Flavor) => {
  let label = '未知'
  if (FLAVOR_NAMES[flavor]) {
    label = FLAVOR_NAMES[flavor]
  }
  return { label, value: flavor }
}

const classesCache: Map<string, number> = new Map()

const loadingCache: Map<string, Promise<WTF[]>> = new Map()

export const loadWTFCharacters = async (flavor: Flavor | string) => {
  const existingPromise = loadingCache.get(flavor)
  if (existingPromise) {
    return existingPromise.then(result => structuredClone(result))
  }

  const promise = (async () => {
    try {
      if (!checkWoWExists()) {
        return []
      }

      const root = getAccountPath(flavor)
      if (!existsSync(root)) {
        return []
      }

      const accounts = await fs_readdir(root)
      const result: WTF[] = []

      for await (const account of accounts) {
        const dir = resolve(root, account)
        const s = await stat(dir)
        if (s.isDirectory()) {
          let accountClassesMap: Record<string, Record<string, string>> | undefined = undefined

          const realms = await fs_readdir(dir)
          for await (const realm of realms) {
            const absolute = resolve(dir, realm)
            const s = await stat(absolute)
            if (s.isDirectory() && realm !== FILENAME_SAVED_VARIABLES) {
              const names = await fs_readdir(absolute)
              for await (const name of names) {
                const s = await stat(resolve(dir, realm, name))
                if (s.isDirectory() && name !== FILENAME_SAVED_VARIABLES) {
                  const savedPath = resolve(dir, realm, name, FILENAME_SAVED_VARIABLES)

                  let classIndex = -1
                  const cacheKey = `${account}:${realm}:${name}:${s.mtime.getTime()}`

                  if (classesCache.has(cacheKey)) {
                    classIndex = classesCache.get(cacheKey)!
                  }

                  if (classIndex === -1) {
                    classIndex = await getClassIndexFromYishier(savedPath)
                  }

                  if (classIndex === -1) {
                    if (!accountClassesMap) {
                      accountClassesMap =
                        (await getClassCharacterMapFromElvUI(dir)) ||
                        (await getClassCharacterMapFromNDui(dir))
                      if (!accountClassesMap) {
                        accountClassesMap = {}
                      }
                    }

                    if (accountClassesMap[realm] && accountClassesMap[realm][name]) {
                      classIndex = classNameToIndex(accountClassesMap[realm][name])
                    }
                  }

                  if (classIndex === -1) {
                    classIndex = 0
                  }

                  classesCache.set(cacheKey, classIndex)

                  result.push({
                    account,
                    name,
                    realm,
                    flavor,
                    classColor: classColorFromIndex(classIndex),
                    logged: !classIndex ? existsSync(savedPath) : true,
                    editDate: s.mtime.getTime()
                  })
                }
              }
            }
          }
        }
      }
      return result
    } catch (e) {
      return []
    } finally {
      loadingCache.delete(flavor)
    }
  })()

  loadingCache.set(flavor, promise)
  return promise
}

export const overwriteCharacterConfig = async (source: WTF, target: WTF) => {
  const store = useStore()
  const sourceAccountPath = resolve(getAccountPath(source.flavor), source.account)
  const targetAccountPath = resolve(getAccountPath(target.flavor), target.account)

  const files: { source: string; target: string }[] = []

  if (store.overwriteWTFConfig.accountAddon || store.overwriteWTFConfig.accountSystem) {
    if (sourceAccountPath !== targetAccountPath) {
      const overwriteFiles: string[] = []
      if (store.overwriteWTFConfig.accountSystem) {
        overwriteFiles.push('config-cache.wtf')
      }

      const sourceAccountFiles = await fs_readdir(sourceAccountPath)
      for await (const file of sourceAccountFiles) {
        const fp = resolve(sourceAccountPath, file)
        const targetFilepath = fp.replace(sourceAccountPath, targetAccountPath)
        const s = await stat(fp)
        if (
          s.isDirectory() &&
          file === FILENAME_SAVED_VARIABLES &&
          store.overwriteWTFConfig.accountAddon
        ) {
          const sourceSavedVariables = await fs_readdir(
            resolve(sourceAccountPath, FILENAME_SAVED_VARIABLES)
          )
          sourceSavedVariables.forEach(file => {
            files.push({
              source: resolve(fp, file),
              target: resolve(targetFilepath, file)
            })
          })
        } else if (overwriteFiles.includes(file)) {
          files.push({
            source: fp,
            target: targetFilepath
          })
        }
      }
    }
  }

  const sourceCharacterPath = resolve(sourceAccountPath, source.realm, source.name)
  const targetCharacterPath = resolve(targetAccountPath, target.realm, target.name)

  const overwriteFiles: string[] = []
  if (store.overwriteWTFConfig.playerAddon) {
    overwriteFiles.push('AddOns.txt')
    overwriteFiles.push('layout-local.txt')
  }
  if (store.overwriteWTFConfig.playerSystem) {
    overwriteFiles.push('config-cache.wtf')
  }
  if (store.overwriteWTFConfig.chat) {
    overwriteFiles.push('chat-cache.txt')
  }

  const sourceCharacterFiles = await fs_readdir(sourceCharacterPath)
  for await (const file of sourceCharacterFiles) {
    const fp = resolve(sourceCharacterPath, file)
    const targetFilepath = fp.replace(sourceCharacterPath, targetCharacterPath)
    const s = await stat(fp)
    if (
      s.isDirectory() &&
      file === FILENAME_SAVED_VARIABLES &&
      store.overwriteWTFConfig.playerAddon
    ) {
      const sourceSavedVariables = await fs_readdir(
        resolve(sourceCharacterPath, FILENAME_SAVED_VARIABLES)
      )
      sourceSavedVariables.forEach(file => {
        files.push({
          source: resolve(fp, file),
          target: resolve(targetFilepath, file)
        })
      })
    } else if (overwriteFiles.includes(file)) {
      files.push({
        source: fp,
        target: targetFilepath
      })
    }
  }

  for await (const file of files) {
    if (existsSync(file.source)) {
      const directoryName = dirname(file.target)
      if (!existsSync(directoryName)) {
        await mkdir(directoryName, { recursive: true })
      }

      const s = await stat(file.source)
      if (!s.isDirectory()) {
        let content = await readFile(file.source, { encoding: 'utf-8' })
        content = content.replaceAll(source.name, target.name)
        content = content.replaceAll(source.realm, target.realm)
        await writeFile(file.target, content, { encoding: 'utf-8' })
      }
    }
  }

  target.classColor = source.classColor
}
