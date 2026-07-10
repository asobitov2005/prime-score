export function HeaderIllustration() {
  return (
    <div className="hidden h-36 w-64 shrink-0 lg:block" aria-hidden="true">
      <svg
        className="animated h-full w-full overflow-visible"
        id="freepik_stories-online-test"
        viewBox="0 0 500 500"
        focusable="false"
      >
        <style>{`
          svg#freepik_stories-online-test .online-test-floor {
            animation: onlineTestSlideUp .72s ease-out both;
            transform-origin: 250px 408px;
          }
          svg#freepik_stories-online-test .online-test-shadow {
            animation: onlineTestLightSpeed .76s ease-out both;
            transform-origin: 304px 385px;
          }
          svg#freepik_stories-online-test .online-test-device {
            animation: onlineTestSlideDown .82s ease-out both;
            transform-origin: 236px 236px;
          }
          svg#freepik_stories-online-test .online-test-paper {
            animation: onlineTestFadeIn .9s ease-out both;
            transform-origin: 213px 184px;
          }
          svg#freepik_stories-online-test .online-test-accent {
            animation: onlineTestSlideLeft .86s ease-out both;
            transform-origin: 385px 180px;
          }
          @keyframes onlineTestSlideUp {
            from { opacity: 0; transform: translateY(28px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes onlineTestLightSpeed {
            from { opacity: 0; transform: translate3d(34px, 0, 0) skewX(-12deg); }
            70% { opacity: 1; transform: skewX(3deg); }
            to { opacity: 1; transform: translate3d(0, 0, 0); }
          }
          @keyframes onlineTestSlideDown {
            from { opacity: 0; transform: translateY(-22px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes onlineTestFadeIn {
            from { opacity: 0; transform: scale(.94); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes onlineTestSlideLeft {
            from { opacity: 0; transform: translateX(24px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            svg#freepik_stories-online-test .online-test-floor,
            svg#freepik_stories-online-test .online-test-shadow,
            svg#freepik_stories-online-test .online-test-device,
            svg#freepik_stories-online-test .online-test-paper,
            svg#freepik_stories-online-test .online-test-accent {
              animation: none;
            }
          }
        `}</style>

        <g className="online-test-floor text-slate-100 dark:text-slate-800">
          <ellipse cx="252" cy="408" rx="206" ry="58" fill="currentColor" />
        </g>

        <g className="online-test-shadow text-slate-200 dark:text-slate-950">
          <path
            d="M159 365.5 300 284.2c5.7-3.3 15.1-3.3 20.8 0l117.4 67.8c5.7 3.3 5.7 8.7 0 12L297.2 445.4c-5.7 3.3-15.1 3.3-20.8 0L159 377.5c-5.7-3.3-5.7-8.7 0-12Z"
            fill="currentColor"
            opacity=".82"
          />
          <path
            d="M66.8 407.8 233.6 311.5c3.2-1.9 8.5-1.9 11.7 0l57.5 33.2c3.2 1.9 3.2 4.9 0 6.8L136 447.8c-3.2 1.9-8.5 1.9-11.7 0l-57.5-33.2c-3.2-1.9-3.2-4.9 0-6.8Z"
            fill="currentColor"
            opacity=".7"
          />
        </g>

        <g className="online-test-device">
          <path
            d="M92.8 338.8c-8 4.6-14.5.9-14.5-8.4V153.2c0-9.2 6.5-20.4 14.5-25L303.2 6.7c8-4.6 14.5-.9 14.5 8.4v177.2c0 9.2-6.5 20.4-14.5 25L92.8 338.8Z"
            className="fill-slate-700 dark:fill-slate-950"
          />
          <path
            d="M97.4 316.7V160.1c0-4 2.8-8.9 6.3-10.9L294 39.3c3.5-2 6.3-.4 6.3 3.6v156.6c0 4-2.8 8.9-6.3 10.9L103.7 320.3c-3.5 2-6.3.4-6.3-3.6Z"
            className="fill-slate-900 dark:fill-slate-800"
          />
          <path
            d="M78.3 303.9v26.5c0 9.3 6.5 13 14.5 8.4l210.4-121.5c8-4.6 14.5-15.8 14.5-25v-26.5Z"
            className="fill-slate-100 dark:fill-slate-700"
          />
          <path
            d="M184.1 333.8 245.8 298c4-2.3 7.3-.4 7.3 4.2v25.4c0 4.6 3.2 10.2 7.3 12.5l27.8 16.1c7.6 4.4 7.6 11.6 0 16l-55.1 31.8c-7.6 4.4-20 4.4-27.6 0l-55.9-32.3c-7.6-4.4-7.6-11.6 0-16l34.5-19.9Z"
            className="fill-slate-200 dark:fill-slate-800"
          />
          <path
            d="M164.9 354.9 290.1 282.6c4-2.3 10.6-2.3 14.6 0l108.6 62.7c4 2.3 4 6.1 0 8.4L288.1 426c-4 2.3-10.6 2.3-14.6 0l-108.6-62.7c-4-2.3-4-6.1 0-8.4Z"
            className="fill-slate-700 dark:fill-slate-950"
          />
          <path
            d="M182.2 358.6 297.1 292.3c2.3-1.3 6-1.3 8.2 0l88.8 51.3c2.3 1.3 2.3 3.4 0 4.7L279.3 414.6c-2.3 1.3-6 1.3-8.2 0l-88.8-51.3c-2.3-1.3-2.3-3.4-.1-4.7Z"
            className="fill-slate-600 dark:fill-slate-900"
          />
          <path
            d="M228 365.1 300.2 323.4c2.1-1.2 5.4-1.2 7.5 0l17.7 10.2c2.1 1.2 2.1 3.2 0 4.3l-72.2 41.7c-2.1 1.2-5.4 1.2-7.5 0L228 369.4c-2.1-1.2-2.1-3.1 0-4.3Z"
            className="fill-slate-400/70 dark:fill-slate-700"
          />
        </g>

        <g className="online-test-paper">
          <path
            d="M131.8 143.2 269.4 63.8c3.7-2.1 6.7-.4 6.7 3.8v107.8c0 4.2-3 9.4-6.7 11.5l-137.6 79.4c-3.7 2.1-6.7.4-6.7-3.8V154.7c0-4.2 3-9.4 6.7-11.5Z"
            className="fill-white dark:fill-slate-100"
          />
          <path
            d="M145.9 159.2 254.8 96.3c2-1.2 3.6-.2 3.6 2v11.4c0 2.2-1.6 5-3.6 6.1l-108.9 62.9c-2 1.2-3.6.2-3.6-2v-11.4c0-2.2 1.6-4.9 3.6-6.1Z"
            fill="#ff7800"
            opacity=".9"
          />
          <path
            d="M147.3 200.8 205.9 167c2.3-1.3 4.1-.3 4.1 2.4 0 2.6-1.8 5.8-4.1 7.1l-58.6 33.8c-2.3 1.3-4.1.3-4.1-2.4 0-2.6 1.8-5.8 4.1-7.1Z"
            className="fill-slate-300 dark:fill-slate-400"
          />
          <path
            d="M147.3 226.5 223.4 182.6c2.3-1.3 4.1-.3 4.1 2.4 0 2.6-1.8 5.8-4.1 7.1L147.3 236c-2.3 1.3-4.1.3-4.1-2.4 0-2.6 1.8-5.8 4.1-7.1Z"
            className="fill-slate-200 dark:fill-slate-300"
          />
          <path
            d="M236.5 156.9c0 11.6-8.1 25.6-18.1 31.4-10 5.8-18.1 1.1-18.1-10.5s8.1-25.6 18.1-31.4c10-5.8 18.1-1.1 18.1 10.5Z"
            fill="#ff7800"
            opacity=".12"
          />
          <path
            d="M212.9 172.6 218.6 175.8 228.8 151.2"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          <path
            d="M145.2 254.4 258.7 188.9"
            fill="none"
            className="stroke-slate-200 dark:stroke-slate-300"
            strokeLinecap="round"
            strokeWidth="6"
          />
        </g>

        <g className="online-test-accent">
          <path
            d="M365.6 88.1c26.6-15.4 48.2-2.9 48.2 27.8s-21.6 68.1-48.2 83.5c-26.6 15.4-48.2 2.9-48.2-27.8s21.6-68.1 48.2-83.5Z"
            className="fill-white dark:fill-slate-900"
          />
          <path
            d="M365.6 101.6c20.2-11.7 36.6-2.2 36.6 21.1s-16.4 51.7-36.6 63.4c-20.2 11.7-36.6 2.2-36.6-21.1s16.4-51.7 36.6-63.4Z"
            className="fill-slate-100 dark:fill-slate-800"
          />
          <path
            d="M365.7 141.4 365.7 120.2"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M365.7 141.4 383.8 130.9"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M350.2 219.6 385.4 199.3c4.2-2.4 7.6-.5 7.6 4.4v39.8c0 4.8-3.4 10.8-7.6 13.2L350.2 277c-4.2 2.4-7.6.5-7.6-4.4v-39.8c0-4.9 3.4-10.8 7.6-13.2Z"
            fill="#ff7800"
            opacity=".16"
          />
          <path
            d="M356.8 235.8 378.7 223.1M356.8 251.8 372 243"
            fill="none"
            stroke="#ff7800"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M101.7 380.2c16.7-2.1 30.1 2.8 40.2 14.7-17 2.8-30.8-2.2-40.2-14.7Z"
            fill="#ff7800"
            opacity=".68"
          />
          <path
            d="M133.9 381.9c5.4-18.4 14.9-30.3 28.6-35.7 1.1 19.6-8.6 31.8-28.6 35.7Z"
            fill="#ff7800"
            opacity=".86"
          />
          <path
            d="M119.2 380.1c-8.8-17.8-9.4-34.5-1.8-50 12.9 13.9 13.5 30.6 1.8 50Z"
            fill="#ff7800"
            opacity=".48"
          />
        </g>
      </svg>
    </div>
  );
}
