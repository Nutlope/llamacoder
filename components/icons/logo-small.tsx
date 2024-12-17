import { ComponentProps } from "react";

export default function LogoSmall(props: ComponentProps<"svg">) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x={0.25}
        y={0.25}
        width={19.5}
        height={19.5}
        rx={1.75}
        fill="url(#paint0_linear_611_2729)"
        stroke="url(#paint1_linear_611_2729)"
        strokeWidth={0.5}
      />
      <g
        style={{
          mixBlendMode: "overlay",
        }}
        filter="url(#filter0_f_611_2729)"
      >
        <path d="M13.584 8.16h4.923" stroke="#D9D9D9" strokeWidth={0.3} />
      </g>
      <g
        style={{
          mixBlendMode: "overlay",
        }}
        filter="url(#filter1_f_611_2729)"
      >
        <path d="M13.143 13.279h4.922" stroke="#D9D9D9" strokeWidth={0.3} />
      </g>
      <g
        style={{
          mixBlendMode: "overlay",
        }}
        filter="url(#filter2_f_611_2729)"
      >
        <path d="M14.43 12.32h2.597" stroke="#D9D9D9" strokeWidth={0.3} />
      </g>
      <g
        style={{
          mixBlendMode: "overlay",
        }}
        filter="url(#filter3_f_611_2729)"
      >
        <path d="M5.582 8.85h2.596" stroke="#D9D9D9" strokeWidth={0.3} />
      </g>
      <g
        style={{
          mixBlendMode: "overlay",
        }}
        filter="url(#filter4_f_611_2729)"
      >
        <path d="M4.546 10.565h1.756" stroke="#D9D9D9" strokeWidth={0.3} />
      </g>
      <path
        d="M12.916 13.426l2.917-3.01-2.917-3.008m-5.833 0l-2.917 3.009 2.917 3.01M11.166 5L8.833 15.834"
        stroke="#fff"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <filter
          id="filter0_f_611_2729"
          x={12.584}
          y={7.0105}
          width={6.92285}
          height={2.2998}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            stdDeviation={0.5}
            result="effect1_foregroundBlur_611_2729"
          />
        </filter>
        <filter
          id="filter1_f_611_2729"
          x={12.1426}
          y={12.1289}
          width={6.92285}
          height={2.2998}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            stdDeviation={0.5}
            result="effect1_foregroundBlur_611_2729"
          />
        </filter>
        <filter
          id="filter2_f_611_2729"
          x={13.4307}
          y={11.1694}
          width={4.59619}
          height={2.2998}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            stdDeviation={0.5}
            result="effect1_foregroundBlur_611_2729"
          />
        </filter>
        <filter
          id="filter3_f_611_2729"
          x={4.58154}
          y={7.70068}
          width={4.59619}
          height={2.2998}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            stdDeviation={0.5}
            result="effect1_foregroundBlur_611_2729"
          />
        </filter>
        <filter
          id="filter4_f_611_2729"
          x={3.5459}
          y={9.41528}
          width={3.75586}
          height={2.2998}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            stdDeviation={0.5}
            result="effect1_foregroundBlur_611_2729"
          />
        </filter>
        <linearGradient
          id="paint0_linear_611_2729"
          x1={10}
          y1={0}
          x2={10}
          y2={20}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#326DF5" />
          <stop offset={1} stopColor="#1D264A" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_611_2729"
          x1={10}
          y1={20}
          x2={10}
          y2={0}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#326DF5" />
          <stop offset={1} stopColor="#1D264A" />
        </linearGradient>
      </defs>
    </svg>
  );
}
