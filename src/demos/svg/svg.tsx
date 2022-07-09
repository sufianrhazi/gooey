import Gooey, { mount } from '../../index';

const root = document.getElementById('app');
if (root) {
    mount(
        root,
        <>
            <h1>Here's an svg</h1>
            <svg
                width="150"
                height="50"
                viewBox="0 0 30 10"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle id="myCircle" cx="5" cy="5" r="4" stroke="blue" />
                <use href="#myCircle" x="10" fill="blue" />
                <use href="#myCircle" x="20" fill="white" stroke="red" />
            </svg>
            <h1>One with embedded style</h1>
            <svg
                width="50"
                height="50"
                viewBox="0 0 10 10"
                xmlns="http://www.w3.org/2000/svg"
            >
                <style>
                    {`
                        circle#target {
                          fill: gold;
                          stroke: maroon;
                          stroke-width: 2px;
                        }
                    `}
                </style>

                <circle id="target" cx="5" cy="5" r="4" />
            </svg>
            <h1>And another complex one</h1>
            <p>
                (source:{' '}
                <a href="http://www.codedread.com/acid/acid1.html">
                    http://www.codedread.com/acid/acid1.html
                </a>
                )
            </p>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                xmlns:svg="http://invalid-url/"
                xmlns:SVG="http://www.w3.org/2000/svg"
                xmlns:scalable_vector_graphics="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                xmlns:xl="http://www.w3.org/1999/xlink"
                xmlns:html="http://www.w3.org/1999/xhtml"
                width="600px"
                height="400px"
                viewBox="-600 -400 1200 800"
                x="-10000"
                y="-10000"
                font-size="100"
                version="1.1"
            >
                <title>
                    <html:h1>SVG Acid Test 1</html:h1>
                </title>
                <desc>
                    <html:p>
                        This test incorporates many key features of
                        <html:a href="http://www.w3.org/TR/SVG11/index.html">
                            SVG
                        </html:a>
                        Tiny 1.1 into one document. It is embedded into the HTML
                        harness document in a variety of manners.
                    </html:p>
                </desc>

                <line
                    x1="0"
                    y1="40%"
                    x2="0"
                    y2="49%"
                    stroke="red"
                    stroke-width="10"
                />

                {/* @ts-ignore */}
                <style type="text/css">{`
                    /* Test 21 */ path,g { color: white; }
                    #nose:hover { fill: rgb(0,0, 258); }
                `}</style>

                <defs>
                    <g id="right-eye-defn">
                        <circle
                            cx="10%"
                            cy="-180"
                            r="33.9"
                            fill="red"
                            stroke="red"
                            stroke-width="5"
                        />
                        <scalable_vector_graphics:path
                            fill="inherit"
                            stroke="black"
                            stroke-width="5"
                            d="M153.9,-180 A33.9,33.9 90 1 1 120,-213.9 a33.9,33.9 90 0 1 33.9,33.9Z"
                        />
                        <ellipse
                            cx="120"
                            cy="-22.5%"
                            rx="0.0000000000000000000000000000000000002E+38"
                            ry="+2000000000000000000000000000000000000000e-38"
                            fill="rgb(-5%,
                  128,	 0%)"
                        ></ellipse>
                    </g>
                </defs>

                <g id="top-group" transform="translate(0,1.E2),scale(.85)">
                    <circle
                        fill="cyan"
                        stroke="red"
                        stroke-width="4.2333mm"
                        cx="0"
                        cy="-5%"
                        r="4in"
                    />
                    <SVG:circle
                        id="head"
                        fill="#FffF00"
                        class="head"
                        cx="0"
                        cy="-5%"
                        r="288pt"
                    />

                    <svg:path
                        d="M-250,-500 L-190,-380 L-250,-343 Z"
                        fill="red"
                    />
                    <path
                        xmlns="http://invalid.namespace/"
                        d="M250,-500 L190,-380 L250,-343 Z"
                        fill="red"
                    />

                    <svg x="-200" y="-250" width="400" height="100"></svg>

                    <g
                        style="fill:white"
                        fill="red"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <g id="left-eye">
                            <circle
                                cx="-10%"
                                cy="-180"
                                r="33.9"
                                fill="red"
                                stroke="red"
                                stroke-width="5"
                            />
                            <scalable_vector_graphics:circle
                                cx="-120"
                                cy="-22.5%"
                                r="3.4%"
                                fill="inherit"
                                stroke="black"
                                stroke-width="5"
                            />
                            <SVG:circle
                                cx="-120"
                                cy="-22.5%"
                                r="2%"
                                fill="red"
                            />
                        </g>
                    </g>

                    <g fill="red">
                        <switch>
                            <rect
                                x="-200"
                                y="-300"
                                width="200"
                                height="200"
                                fill="orange"
                                requiredFeatures="http://www.w3.org/TR/SVG11/feature#Shape
           		 bogus-feature"
                            />
                            <rect
                                x="-200"
                                y="-300"
                                width="200"
                                height="200"
                                fill="purple"
                                requiredFeatures="http://www.w3.org/TR/SVG11/feature#Shape"
                                requiredExtensions="bogus-extension"
                            />
                            <use
                                id="right-eye"
                                xl:href="#right-eye-defn"
                                requiredFeatures="http://www.w3.org/TR/SVG11/feature#Shape
                "
                            />
                            <rect
                                x="-200"
                                y="-300"
                                width="200"
                                height="200"
                                fill="red"
                            />
                        </switch>
                    </g>

                    <symbol id="nose-symbol">
                        <rect
                            x="-55"
                            y="-55"
                            width="110"
                            height="110"
                            fill="inherit"
                        />
                    </symbol>
                    <circle cx="0" cy="0" r="25" fill="red" />
                    <use
                        id="nose"
                        xlink:href="#nose-symbol"
                        x="-27.5"
                        y="-27.5"
                        display="inline"
                        fill="black"
                        transform="rotate(45)"
                    />

                    <path
                        fill="black"
                        stroke="black"
                        stroke-width="5"
                        transform="scale(1-1)translate(470-200)rotate(180
              -235+100)"
                        d="M-335,10000E-2 m100,0 	C-.15E3,150 150,	150 235,100 
              c-85,200 -385,+2.E2 -470.0000,0 Z"
                    />

                    <path
                        fill="none"
                        stroke="black"
                        stroke-width="5"
                        d="M-230,65 C-265,60 -290,85 -280,110"
                    />
                    <path
                        fill="none"
                        stroke="red"
                        stroke-width="4"
                        d="M230,65 C265,60 290,85 280,110"
                    />
                    <path
                        fill="none"
                        stroke="rgb(00,0,0)"
                        stroke-width="5"
                        d="M230,65 Q290,64 280,110"
                    />

                    <path
                        fill="currentColor"
                        stroke="#333"
                        stroke-width="5"
                        d="M1,138 l44,-2 v49 h-44 Z"
                    />
                    <g fill="currentColor" stroke="#333" stroke-width="5">
                        <path
                            transform="skewX(45)"
                            d="M-139,138 L-183,136 -230,185 H-186 Z"
                        />
                    </g>
                    <path
                        transform="skewY(45)"
                        fill="WHITE"
                        stroke="#333"
                        stroke-width="5"
                        d="M48,88 L91,43 V93 L48,136 Z"
                    />
                    <path
                        transform="matrix(0 1 1 0 1000 1000)"
                        fill="White"
                        stroke="#333333"
                        stroke-width="5.0"
                        d="M-864-1048L-866-1091L-816-1091L-816-1048z"
                    />

                    <g fill="white" stroke="#333" stroke-width="5">
                        <path d="M-135,130 L-95,134 -95,180 -135,180 Z" />
                        <path d="M135,130 L95,134 95,180 135,180 Z" />
                    </g>

                    <text
                        font-family="Arial"
                        font-size="100"
                        fill="red"
                        x="0"
                        y="-500"
                        text-anchor="middle"
                    >
                        Hello World!
                    </text>
                    <text
                        font-family="Arial"
                        font-size="100"
                        fill="blue"
                        x="0"
                        y="-500"
                        text-anchor="middle"
                    >
                        <tspan baseline-shift="sub" dy="-50">
                            Hello <tspan dy="50">World!</tspan>
                        </tspan>
                    </text>

                    <line
                        x1="-3em"
                        y1="-480"
                        x2="3em"
                        y2="-480"
                        stroke="blue"
                        stroke-width="5"
                        fill="red"
                    />
                </g>
            </svg>
        </>
    );
}
