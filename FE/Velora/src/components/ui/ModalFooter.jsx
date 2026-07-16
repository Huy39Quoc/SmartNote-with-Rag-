export default function ModalFooter({ children, align = 'end' }) {
    const justifyContent = align === 'start'
        ? 'flex-start'
        : align === 'center'
            ? 'center'
            : 'flex-end'

    return <div style={{ ...styles.footer, justifyContent }}>{children}</div>
}

const styles = {
    footer: { display: 'flex', alignItems: 'center', gap: 8 },
}
