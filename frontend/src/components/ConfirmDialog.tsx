import React, { Fragment, createContext, useCallback, useContext, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'

type ConfirmOptions = {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return ctx
}

interface State {
  open: boolean
  options: ConfirmOptions
  resolve?: (result: boolean) => void
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<State>({ open: false, options: {} })

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleClose = (result: boolean) => {
    if (state.resolve) {
      state.resolve(result)
    }
    setState((prev) => ({ ...prev, open: false, resolve: undefined }))
  }

  const { title, message, confirmText, cancelText } = state.options

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Transition appear show={state.open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => handleClose(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-2 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl">
                  <div className="border-b px-5 py-3">
                    <Dialog.Title className="text-sm font-semibold text-gray-900">
                      {title ?? 'Xóa nội dung'}
                    </Dialog.Title>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm text-gray-700">
                      {message ?? 'Bạn có chắc chắn muốn thực hiện thao tác này?'}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => handleClose(false)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {cancelText ?? 'Hủy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClose(true)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      {confirmText ?? 'Xóa'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </ConfirmContext.Provider>
  )
}


