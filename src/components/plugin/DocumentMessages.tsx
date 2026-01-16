import React, { useCallback, useEffect, useState } from "react";
import { useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTldrawInObsdianPlugin } from "src/contexts/plugin";
import { DocumentMessagesButton } from "src/obsidian/plugin/instance";

export default function DocumentMessages() {
    const instance = useTldrawInObsdianPlugin();

    const dmbStore = useMemo(() => {
        return instance.stores.documentMessages;
    }, [instance]);

    const dmbss = useSyncExternalStore(dmbStore.addListener, dmbStore.getAll);
    
    return (
        <>
            {
                dmbss.map((e, i) => (
                    <DocumentMessagesButtonPortal key={e.key} button={e} />
                ))
            }
        </>
    )
}

function DocumentMessagesButtonPortal({
    button
}: {
    button: DocumentMessagesButton
}) {
    const [count, setCount] = useState(() => button.messages.getCount());
    const cb = useCallback((evt: MouseEvent) => {
        console.log(evt)
        // TODO: Show a modal with the messages
    }, [])

    useEffect(() => {
        button.onClicked = cb
        return () => button.onClicked = undefined
    }, [button])

    useEffect(() => {
        return button.messages.addListener(() => {
            setCount(button.messages.getCount())
        })
    }, [button])

    return (
        <>
            {createPortal(
                <div className="ptl-document-messages-count">
                    {count || undefined}
                </div>,
                button.actionEl
            )}
        </>
    )
}