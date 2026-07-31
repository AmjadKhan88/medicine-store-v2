import './RipleLoader.css';
export default function ShortLoader({text=""}) {
  return (
        <div class="loader-card">
            <div class="ripple">
                <div class="r-dot"></div>
                <div class="r-dot"></div>
                <div class="r-dot"></div>
                <div class="r-dot"></div>
                <div class="r-dot"></div>
            </div>
            {text && <span>{text}</span>}
        </div>
  )
}
