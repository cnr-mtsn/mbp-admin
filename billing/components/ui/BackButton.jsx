import Link from "next/link"
import Icon from "./Icon"

export default function BackButton({ href = "/", title, classes = "" }) {
    return (
        <Link
            href={href}
            className={`btn-secondary ${classes}`}
            title={title || "Go back"}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '2.5rem',
                minHeight: '2.5rem',
                padding: '0.5rem'
            }}
        >
            <Icon name="back" size={10} />
        </Link>
    )
}