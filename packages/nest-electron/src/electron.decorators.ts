import { Inject } from '@nestjs/common'
import { MessagePattern } from '@nestjs/microservices'
import { ipcMain } from 'electron'
import { ELECTRON_WINDOW, ELECTRON_WINDOW_DEFAULT_NAME, IPC_HANDLE, IPC_ON } from './electron.constants'
import { ipcMessageDispatcher } from './transport'

/**
 * Ipc handle decorator. It will be called by ipcRenderer.invoke
 *
 * ipcMain.handle --> @IpcHandle
 */
export function IpcHandle(channel: string) {
  if (!channel)
    throw new Error('ipc handle channel is required')

  ipcMain.handle(channel, (...args) => ipcMessageDispatcher.emit(channel, IPC_HANDLE, ...args))

  return MessagePattern(channel)
}

/**
 * Ipc on decorator. It will be called by ipcRenderer.send/sendSync
 *
 * ipcMain.on --> @IpcOn
 */
export function IpcOn(channel: string) {
  if (!channel)
    throw new Error('ipc on channel is required')

  ipcMain.on(channel, (...args) => ipcMessageDispatcher.emit(channel, IPC_ON, ...args))

  // Do not modify the order!
  return MessagePattern(channel)
}

/**
 * This decorator helps you get multiple parameters from IPC communication, rather than a single array or object
 *
 * @NOTE Because it modifies the method's reference relationship, place it at the bottom of all decorators
 */
export function MultiParams(): MethodDecorator {
  return (
    _target: object,
    _key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value
    descriptor.value = function (this: any, ...args: any[]) {
      // args is from ipc
      if (args.length > 0 && Array.isArray(args[0]) && args[0][args[0].length - 1].evt) {
        return originalMethod.apply(this, args[0])
      }
      else { // args is from direct call
        return originalMethod.apply(this, args)
      }
    }
    return descriptor
  }
}

/**
 * Window decorator, help to inject window
 */
export const Window = (name = ELECTRON_WINDOW_DEFAULT_NAME): ReturnType<typeof Inject> => Inject(`${ELECTRON_WINDOW}:${name}`)
