import loadingStyles from '../../styles/loading.module.css';

export default function Loading() {
    return (
        <div className={loadingStyles.circlesFade}>
            <div></div>
            <div></div>
            <div></div>
        </div>
    )
}