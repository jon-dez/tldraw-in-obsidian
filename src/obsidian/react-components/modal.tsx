import { App, Modal } from 'obsidian'
import React, { ReactNode, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
	app: App
}

/**
 * A wrapper for the Obsidian {@linkcode Modal} component that allows for React rendering inside the modal.
 *
 */
export function ModalWrapper({
	open,
	modalProps,
	children,
	onClose,
}: {
	modalProps: ModalProps
	open: boolean
	children: ReactNode
	onClose: () => void
}) {
	const modal = useMemo(() => {
		return new Modal(modalProps.app).setCloseCallback(onClose)
	}, [modalProps])

	useEffect(() => {
		return () => {
			// Modal or modalProps changed, close the old one
			modal.close()
		}
	}, [modal, modalProps])

	useEffect(() => {
		if (open) {
			modal.open()
		} else {
			modal.close()
		}
	}, [modal, open])

	return <>{createPortal(children, modal.contentEl)}</>
}
