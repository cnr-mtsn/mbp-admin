import Link from "next/link"
import Icon from "./Icon"

export default function BackButton({ href = "/", title, classes = "" }) {
    return (
        <Link
            href={href}
            className={`btn-secondary ${classes}`}
            title={title || "Go back"}
        >
            <Icon name="back" size={10} />
        </Link>
    )
}