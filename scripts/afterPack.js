import fs from "node:fs"

export default async function (context) {
  const localeDir = context.appOutDir + '/locales/'

  fs.readdir(localeDir, function (err, files) {
    if (!(files && files.length)) return
    for (let i = 0, len = files.length; i < len; i++) {
      const match = files[i].match(/zh-CN\.pak/) //只保留中文
      if (match === null) {
        fs.unlinkSync(localeDir + files[i])
      }
    }
  })
}
