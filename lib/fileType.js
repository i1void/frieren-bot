import * as ft from 'file-type'

const detect = ft.fileTypeFromBuffer ?? ft.fromBuffer ?? ft.default?.fromBuffer ?? ft.default?.fileTypeFromBuffer

export const fromBuffer = (buffer) => detect(buffer)
