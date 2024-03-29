import Gooey, { mount } from '../../index';

const root = document.getElementById('app');
if (root) {
    mount(
        root,
        <>
            <h1>MathML edge cases</h1>
            <p>
                Source:{' '}
                <a href="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/">
                    https://fred-wang.github.io/MathFonts/mozilla_mathml_test/
                </a>
            </p>
            <table>
                <tbody>
                    <tr>
                        <td></td>
                        <th scope="col">As rendered by TeX</th>
                        <th scope="col">As rendered by your browser</th>
                    </tr>
                    <tr>
                        <td>1</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex1.png"
                                alt="TeXbook, 16.2-16.3"
                                width="38"
                                height="22"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msup>
                                        <mi>x</mi>
                                        <mn>2</mn>
                                    </msup>
                                    <msup>
                                        <mi>y</mi>
                                        <mn>2</mn>
                                    </msup>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex2.png"
                                alt="TeXbook, 16.2-16.3"
                                width="30"
                                height="17"
                            />
                        </td>
                        <td>
                            <math display="block">
                                {/*
            <!--
                <mrow>
                  <msub>
                    <mi>
                    </mi>
                    <mn>2</mn>
                  </msub>
                  <msub>
                    <mi>F</mi>
                    <mn>3</mn>
                  </msub>
                </mrow>
                -->
                */}
                                <mrow>
                                    <mmultiscripts>
                                        <mi>F</mi>
                                        <mn>3</mn>
                                        <none></none>
                                        <mprescripts></mprescripts>
                                        <mn>2</mn>
                                        <none></none>
                                    </mmultiscripts>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex21.png"
                                alt="TeXbook, 17-17.1"
                                width="58"
                                height="47"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mfrac>
                                        <mrow>
                                            <mi>x</mi>
                                            <mo>+</mo>
                                            <msup>
                                                <mi>y</mi>
                                                <mn>2</mn>
                                            </msup>
                                        </mrow>
                                        <mrow>
                                            <mi>k</mi>
                                            <mo>+</mo>
                                            <mn>1</mn>
                                        </mrow>
                                    </mfrac>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>4</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex22.png"
                                alt="TeXbook, 17-17.1"
                                width="76"
                                height="25"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mi>x</mi>
                                    <mo>+</mo>
                                    <msup>
                                        <mi>y</mi>
                                        <mfrac>
                                            <mn>2</mn>
                                            <mrow>
                                                <mi>k</mi>
                                                <mo>+</mo>
                                                <mn>1</mn>
                                            </mrow>
                                        </mfrac>
                                    </msup>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>5</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex23.png"
                                alt="TeXbook, 17-17.1"
                                width="30"
                                height="42"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mfrac>
                                        <mi>a</mi>
                                        <mrow>
                                            <mi>b</mi>
                                            <mo>/</mo>
                                            <mn>2</mn>
                                        </mrow>
                                    </mfrac>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>6</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex24.png"
                                alt="TeXbook, 17.5-17.6"
                                width="220"
                                height="138"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msub>
                                        <mi>a</mi>
                                        <mn>0</mn>
                                    </msub>
                                    <mo>+</mo>
                                    <mfrac>
                                        <mn>1</mn>
                                        <mstyle
                                            scriptlevel="0"
                                            displaystyle="true"
                                        >
                                            <msub>
                                                <mi>a</mi>
                                                <mn>1</mn>
                                            </msub>
                                            <mo>+</mo>
                                            <mfrac>
                                                <mn>1</mn>
                                                <mstyle
                                                    scriptlevel="0"
                                                    displaystyle="true"
                                                >
                                                    <msub>
                                                        <mi>a</mi>
                                                        <mn>2</mn>
                                                    </msub>
                                                    <mo>+</mo>
                                                    <mfrac>
                                                        <mn>1</mn>
                                                        <mstyle
                                                            scriptlevel="0"
                                                            displaystyle="true"
                                                        >
                                                            <msub>
                                                                <mi>a</mi>
                                                                <mn>3</mn>
                                                            </msub>
                                                            <mo>+</mo>
                                                            <mfrac>
                                                                <mn>1</mn>
                                                                <mstyle
                                                                    scriptlevel="0"
                                                                    displaystyle="true"
                                                                >
                                                                    <msub>
                                                                        <mi>
                                                                            a
                                                                        </mi>
                                                                        <mn>
                                                                            4
                                                                        </mn>
                                                                    </msub>
                                                                </mstyle>
                                                            </mfrac>
                                                        </mstyle>
                                                    </mfrac>
                                                </mstyle>
                                            </mfrac>
                                        </mstyle>
                                    </mfrac>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>7</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex25.png"
                                alt="TeXbook, 17.5-17.6"
                                width="200"
                                height="85"
                            />
                        </td>
                        <td>
                            <math>
                                <mrow>
                                    <msub>
                                        <mi>a</mi>
                                        <mn>0</mn>
                                    </msub>
                                    <mo>+</mo>
                                    <mfrac>
                                        <mn>1</mn>
                                        <mrow>
                                            <msub>
                                                <mi>a</mi>
                                                <mn>1</mn>
                                            </msub>
                                            <mo>+</mo>
                                            <mfrac>
                                                <mn>1</mn>
                                                <mrow>
                                                    <msub>
                                                        <mi>a</mi>
                                                        <mn>2</mn>
                                                    </msub>
                                                    <mo>+</mo>
                                                    <mfrac>
                                                        <mn>1</mn>
                                                        <mrow>
                                                            <msub>
                                                                <mi>a</mi>
                                                                <mn>3</mn>
                                                            </msub>
                                                            <mo>+</mo>
                                                            <mfrac>
                                                                <mn>1</mn>
                                                                <mrow>
                                                                    <msub>
                                                                        <mi>
                                                                            a
                                                                        </mi>
                                                                        <mn>
                                                                            4
                                                                        </mn>
                                                                    </msub>
                                                                </mrow>
                                                            </mfrac>
                                                        </mrow>
                                                    </mfrac>
                                                </mrow>
                                            </mfrac>
                                        </mrow>
                                    </mfrac>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>8</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex26.png"
                                alt="TeXbook, 17.5-17.6"
                                width="54"
                                height="50"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mo>(</mo>
                                    <mfrac linethickness="0px">
                                        <mi>n</mi>
                                        <mrow>
                                            <mi>k</mi>
                                            <mo>/</mo>
                                            <mn>2</mn>
                                        </mrow>
                                    </mfrac>
                                    <mo>)</mo>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>9</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex27.png"
                                alt="TeXbook, 17.7"
                                width="237"
                                height="50"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mrow>
                                        <mo>(</mo>
                                        <mfrac linethickness="0px">
                                            <mi>p</mi>
                                            <mn>2</mn>
                                        </mfrac>
                                        <mo>)</mo>
                                    </mrow>
                                    <msup>
                                        <mi>x</mi>
                                        <mn>2</mn>
                                    </msup>
                                    <msup>
                                        <mi>y</mi>
                                        <mrow>
                                            <mi>p</mi>
                                            <mo>−</mo>
                                            <mn>2</mn>
                                        </mrow>
                                    </msup>
                                    <mo>−</mo>
                                    <mfrac>
                                        <mn>1</mn>
                                        <mrow>
                                            <mn>1</mn>
                                            <mo>−</mo>
                                            <mi>x</mi>
                                        </mrow>
                                    </mfrac>
                                    <mfrac>
                                        <mn>1</mn>
                                        <mrow>
                                            <mn>1</mn>
                                            <mo>−</mo>
                                            <msup>
                                                <mi>x</mi>
                                                <mn>2</mn>
                                            </msup>
                                        </mrow>
                                    </mfrac>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>10</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex29.png"
                                alt="TeXbook, 17.7-17.8"
                                width="116"
                                height="63"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <munder>
                                        <mo>∑</mo>
                                        <mrow>
                                            <mfrac linethickness="0px">
                                                <mrow>
                                                    <mn>0</mn>
                                                    <mo>≤</mo>
                                                    <mi>i</mi>
                                                    <mo>≤</mo>
                                                    <mi>m</mi>
                                                </mrow>
                                                <mrow>
                                                    <mn>0</mn>
                                                    <mo>&lt;</mo>
                                                    <mi>j</mi>
                                                    <mo>&lt;</mo>
                                                    <mi>n</mi>
                                                </mrow>
                                            </mfrac>
                                        </mrow>
                                    </munder>
                                    <mi>P</mi>
                                    <mo stretchy="false">(</mo>
                                    <mi>i</mi>
                                    <mo>,</mo>
                                    <mi>j</mi>
                                    <mo stretchy="false">)</mo>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>11</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex3.png"
                                alt="TeXbook, 16.2-16.3"
                                width="27"
                                height="18"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msup>
                                        <mi>x</mi>
                                        <mrow>
                                            <mn>2</mn>
                                            <mi>y</mi>
                                        </mrow>
                                    </msup>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>12</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex30.png"
                                alt="TeXbook, 17.8"
                                width="175"
                                height="61"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <munderover>
                                        <mo>∑</mo>
                                        <mrow>
                                            <mi>i</mi>
                                            <mo>=</mo>
                                            <mn>1</mn>
                                        </mrow>
                                        <mi>p</mi>
                                    </munderover>
                                    <munderover>
                                        <mo>∑</mo>
                                        <mrow>
                                            <mi>j</mi>
                                            <mo>=</mo>
                                            <mn>1</mn>
                                        </mrow>
                                        <mi>q</mi>
                                    </munderover>
                                    <munderover>
                                        <mo>∑</mo>
                                        <mrow>
                                            <mi>k</mi>
                                            <mo>=</mo>
                                            <mn>1</mn>
                                        </mrow>
                                        <mi>r</mi>
                                    </munderover>
                                    <msub>
                                        <mi>a</mi>
                                        <mrow>
                                            <mi>i</mi>
                                            <mi>j</mi>
                                        </mrow>
                                    </msub>
                                    <msub>
                                        <mi>b</mi>
                                        <mrow>
                                            <mi>j</mi>
                                            <mi>k</mi>
                                        </mrow>
                                    </msub>
                                    <msub>
                                        <mi>c</mi>
                                        <mrow>
                                            <mi>k</mi>
                                            <mi>i</mi>
                                        </mrow>
                                    </msub>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>13</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex31.png"
                                alt="TeXbook, 17.9-17.10"
                                width="405"
                                height="100"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msqrt>
                                        <mn>1</mn>
                                        <mo>+</mo>
                                        <msqrt>
                                            <mn>1</mn>
                                            <mo>+</mo>
                                            <msqrt>
                                                <mn>1</mn>
                                                <mo>+</mo>
                                                <msqrt>
                                                    <mn>1</mn>
                                                    <mo>+</mo>
                                                    <msqrt>
                                                        <mn>1</mn>
                                                        <mo>+</mo>
                                                        <msqrt>
                                                            <mn>1</mn>
                                                            <mo>+</mo>
                                                            <msqrt>
                                                                <mn>1</mn>
                                                                <mo>+</mo>
                                                                <mi>x</mi>
                                                            </msqrt>
                                                        </msqrt>
                                                    </msqrt>
                                                </msqrt>
                                            </msqrt>
                                        </msqrt>
                                    </msqrt>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>14</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex34.png"
                                alt="TeXbook, 17.10"
                                width="272"
                                height="50"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mrow>
                                        <mo>(</mo>
                                        <mfrac>
                                            <msup>
                                                <mo>∂</mo>
                                                <mn>2</mn>
                                            </msup>
                                            <mrow>
                                                <mo>∂</mo>
                                                <msup>
                                                    <mi>x</mi>
                                                    <mn>2</mn>
                                                </msup>
                                            </mrow>
                                        </mfrac>
                                        <mo>+</mo>
                                        <mfrac>
                                            <msup>
                                                <mo>∂</mo>
                                                <mn>2</mn>
                                            </msup>
                                            <mrow>
                                                <mo>∂</mo>
                                                <msup>
                                                    <mi>y</mi>
                                                    <mn>2</mn>
                                                </msup>
                                            </mrow>
                                        </mfrac>
                                        <mo>)</mo>
                                    </mrow>
                                    <msup>
                                        <mrow>
                                            <mo minsize="150%">|</mo>
                                            <mi>φ{/*<!-- \varphi -->*/}</mi>
                                            <mo stretchy="false">(</mo>
                                            <mi>x</mi>
                                            <mo>+</mo>
                                            <mi mathvariant="normal">i</mi>
                                            <mi>y</mi>
                                            <mo stretchy="false">)</mo>
                                            <mo minsize="150%">|</mo>
                                        </mrow>
                                        <mn>2</mn>
                                    </msup>
                                    <mo>=</mo>
                                    <mn>0</mn>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>15</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex4.png"
                                alt="TeXbook, 16.2-16.3"
                                width="31"
                                height="22"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msup>
                                        <mn>2</mn>
                                        <msup>
                                            <mn>2</mn>
                                            <msup>
                                                <mn>2</mn>
                                                <mi>x</mi>
                                            </msup>
                                        </msup>
                                    </msup>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>16</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex40.png"
                                alt="TeXbook, 18.10-18.11"
                                width="55"
                                height="49"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msubsup>
                                        <mo stretchy="false">∫</mo>
                                        <mn>1</mn>
                                        <mi>x</mi>
                                    </msubsup>
                                    <mfrac>
                                        <mrow>
                                            <mi>d</mi>
                                            <mi>t</mi>
                                        </mrow>
                                        <mi>t</mi>
                                    </mfrac>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>17</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex41.png"
                                alt="TeXbook, 18.12-18.13"
                                width="91"
                                height="47"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msub>
                                        <mo>∬{/*<!-- \iint -->*/}</mo>
                                        <mi>D</mi>
                                    </msub>
                                    <mi>d</mi>
                                    <mi>x</mi>
                                    <mspace width="0.1111111111111111em"></mspace>
                                    <mi>d</mi>
                                    <mi>y</mi>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>18</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex43.png"
                                alt="TeXbook, 18.23"
                                width="250"
                                height="66"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mi>f</mi>
                                    <mo stretchy="false">(</mo>
                                    <mi>x</mi>
                                    <mo stretchy="false">)</mo>
                                    <mo>=</mo>
                                    <mrow>
                                        <mo>{'{'}</mo>
                                        <mtable>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <mrow>
                                                        <mn>1</mn>
                                                        <mo>/</mo>
                                                        <mn>3</mn>
                                                    </mrow>
                                                </mtd>
                                                <mtd columnalign="left">
                                                    <mrow>
                                                        <mtext>if&nbsp;</mtext>
                                                        <mn>0</mn>
                                                        <mo>≤</mo>
                                                        <mi>x</mi>
                                                        <mo>≤</mo>
                                                        <mn>1</mn>
                                                        <mo>;</mo>
                                                    </mrow>
                                                </mtd>
                                            </mtr>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <mrow>
                                                        <mn>2</mn>
                                                        <mo>/</mo>
                                                        <mn>3</mn>
                                                    </mrow>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <mrow>
                                                        <mtext>if&nbsp;</mtext>
                                                        <mn>3</mn>
                                                        <mo>≤</mo>
                                                        <mi>x</mi>
                                                        <mo>≤</mo>
                                                        <mn>4</mn>
                                                        <mo>;</mo>
                                                    </mrow>
                                                </mtd>
                                            </mtr>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <mn>0</mn>
                                                </mtd>
                                                <mtd columnalign="left">
                                                    <mtext>elsewhere.</mtext>
                                                </mtd>
                                            </mtr>
                                        </mtable>
                                    </mrow>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>19</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex44.png"
                                alt="TeXbook, 18.23-18.24"
                                width="101"
                                height="44"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mover>
                                    <mrow>
                                        <mi>x</mi>
                                        <mo>+</mo>
                                        <mo>...</mo>
                                        <mo>+</mo>
                                        <mi>x</mi>
                                    </mrow>
                                    <mover>
                                        <mo>⏞</mo>
                                        <mrow>
                                            <mi>k</mi>
                                            <mspace width="0.1111111111111111em"></mspace>
                                            <mtext>times</mtext>
                                        </mrow>
                                    </mover>
                                </mover>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>20</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex5.png"
                                alt="TeXbook, 16.2-16.3"
                                width="25"
                                height="13"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msub>
                                        <mi>y</mi>
                                        <msup>
                                            <mi>x</mi>
                                            <mn>2</mn>
                                        </msup>
                                    </msub>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>21</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex51.png"
                                alt="TeXbook, 18.40"
                                width="253"
                                height="56"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <munder>
                                        <mo>∑</mo>
                                        <mrow>
                                            <mi>p</mi>
                                            <mtext>&nbsp;prime</mtext>
                                        </mrow>
                                    </munder>
                                    <mi>f</mi>
                                    <mo stretchy="false">(</mo>
                                    <mi>p</mi>
                                    <mo stretchy="false">)</mo>
                                    <mo>=</mo>
                                    <msub>
                                        <mo stretchy="false">∫</mo>
                                        <mrow>
                                            <mi>t</mi>
                                            <mo>&gt;</mo>
                                            <mn>1</mn>
                                        </mrow>
                                    </msub>
                                    <mi>f</mi>
                                    <mo stretchy="false">(</mo>
                                    <mi>t</mi>
                                    <mo stretchy="false">)</mo>
                                    <mspace width="0.1111111111111111em"></mspace>
                                    <mi>d</mi>
                                    <mi>π</mi>
                                    <mo stretchy="false">(</mo>
                                    <mi>t</mi>
                                    <mo stretchy="false">)</mo>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>22</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex52.png"
                                alt="TeXbook, 18.41"
                                width="159"
                                height="81"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mo stretchy="false">{'{'}</mo>
                                    <munder>
                                        <mrow>
                                            <mover>
                                                <mrow>
                                                    <mpadded width="0em">
                                                        <mphantom>
                                                            <mo>(</mo>
                                                        </mphantom>
                                                    </mpadded>
                                                    <mi>a</mi>
                                                    <mo>,</mo>
                                                    <mo>...</mo>
                                                    <mo>,</mo>
                                                    <mi>a</mi>
                                                </mrow>
                                                <mover>
                                                    <mo>⏞</mo>
                                                    <mrow>
                                                        <mi>k</mi>
                                                        <mtext>&nbsp;</mtext>
                                                        <mi>a</mi>
                                                        <mtext>'s</mtext>
                                                    </mrow>
                                                </mover>
                                            </mover>
                                            <mo>,</mo>
                                            <mover>
                                                <mrow>
                                                    <mpadded width="0em">
                                                        <mphantom>
                                                            <mo>(</mo>
                                                        </mphantom>
                                                    </mpadded>
                                                    <mi>b</mi>
                                                    <mo>,</mo>
                                                    <mo>...</mo>
                                                    <mo>,</mo>
                                                    <mi>b</mi>
                                                </mrow>
                                                <mover>
                                                    <mo>⏞</mo>
                                                    <mrow>
                                                        <mi>ℓ</mi>
                                                        <mtext>&nbsp;</mtext>
                                                        <mi>b</mi>
                                                        <mtext>'s</mtext>
                                                    </mrow>
                                                </mover>
                                            </mover>
                                        </mrow>
                                        <munder>
                                            <mo>⏟</mo>
                                            <mrow>
                                                <mi>k</mi>
                                                <mo>+</mo>
                                                <mi>ℓ</mi>
                                                <mtext>&nbsp;elements</mtext>
                                            </mrow>
                                        </munder>
                                    </munder>
                                    <mo stretchy="false">{'}'}</mo>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>23</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex53.png"
                                alt="TeXbook, 18.42"
                                width="213"
                                height="108"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mo>(</mo>
                                    <mtable>
                                        <mtr>
                                            <mtd columnalign="center">
                                                <mrow>
                                                    <mo>(</mo>
                                                    <mtable>
                                                        <mtr>
                                                            <mtd columnalign="center">
                                                                <mi>a</mi>
                                                            </mtd>
                                                            <mtd columnalign="center">
                                                                <mi>b</mi>
                                                            </mtd>
                                                        </mtr>
                                                        <mtr>
                                                            <mtd columnalign="center">
                                                                <mi>c</mi>
                                                            </mtd>
                                                            <mtd columnalign="center">
                                                                <mi>d</mi>
                                                            </mtd>
                                                        </mtr>
                                                    </mtable>
                                                    <mo>)</mo>
                                                </mrow>
                                            </mtd>
                                            <mtd columnalign="center">
                                                <mrow>
                                                    <mo>(</mo>
                                                    <mtable>
                                                        <mtr>
                                                            <mtd columnalign="center">
                                                                <mi>e</mi>
                                                            </mtd>
                                                            <mtd columnalign="center">
                                                                <mi>f</mi>
                                                            </mtd>
                                                        </mtr>
                                                        <mtr>
                                                            <mtd columnalign="center">
                                                                <mi>g</mi>
                                                            </mtd>
                                                            <mtd columnalign="center">
                                                                <mi>h</mi>
                                                            </mtd>
                                                        </mtr>
                                                    </mtable>
                                                    <mo>)</mo>
                                                </mrow>
                                            </mtd>
                                        </mtr>
                                        <mtr>
                                            <mtd columnalign="center">
                                                <mn>0</mn>
                                            </mtd>
                                            <mtd columnalign="center">
                                                <mrow>
                                                    <mo>(</mo>
                                                    <mtable>
                                                        <mtr>
                                                            <mtd columnalign="center">
                                                                <mi>i</mi>
                                                            </mtd>
                                                            <mtd columnalign="center">
                                                                <mi>j</mi>
                                                            </mtd>
                                                        </mtr>
                                                        <mtr>
                                                            <mtd columnalign="center">
                                                                <mi>k</mi>
                                                            </mtd>
                                                            <mtd columnalign="center">
                                                                <mi>l</mi>
                                                            </mtd>
                                                        </mtr>
                                                    </mtable>
                                                    <mo>)</mo>
                                                </mrow>
                                            </mtd>
                                        </mtr>
                                    </mtable>
                                    <mo>)</mo>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>24</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex54.png"
                                alt="TeXbook, 18.43"
                                width="344"
                                height="130"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <mi>det</mi>
                                    <mrow>
                                        <mo>|</mo>
                                        <mtable>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>0</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>1</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>2</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <mo>…</mo>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mi>n</mi>
                                                    </msub>
                                                </mtd>
                                            </mtr>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>1</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>2</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>3</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <mo>…</mo>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mrow>
                                                            <mi>n</mi>
                                                            <mo>+</mo>
                                                            <mn>1</mn>
                                                        </mrow>
                                                    </msub>
                                                </mtd>
                                            </mtr>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>2</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>3</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mn>4</mn>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <mo>…</mo>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mrow>
                                                            <mi>n</mi>
                                                            <mo>+</mo>
                                                            <mn>2</mn>
                                                        </mrow>
                                                    </msub>
                                                </mtd>
                                            </mtr>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <mo>⋮</mo>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <mo>⋮</mo>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <mo>⋮</mo>
                                                </mtd>
                                                <mtd columnalign="center"></mtd>
                                                <mtd columnalign="center">
                                                    <mo>⋮</mo>
                                                </mtd>
                                            </mtr>
                                            <mtr>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mi>n</mi>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mrow>
                                                            <mi>n</mi>
                                                            <mo>+</mo>
                                                            <mn>1</mn>
                                                        </mrow>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mrow>
                                                            <mi>n</mi>
                                                            <mo>+</mo>
                                                            <mn>2</mn>
                                                        </mrow>
                                                    </msub>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <mo>…</mo>
                                                </mtd>
                                                <mtd columnalign="center">
                                                    <msub>
                                                        <mi>c</mi>
                                                        <mrow>
                                                            <mn>2</mn>
                                                            <mi>n</mi>
                                                        </mrow>
                                                    </msub>
                                                </mtd>
                                            </mtr>
                                        </mtable>
                                        <mo>|</mo>
                                    </mrow>
                                    <mo>&gt;</mo>
                                    <mn>0</mn>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>25</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex6.png"
                                alt="TeXbook, 16.2-16.3"
                                width="25"
                                height="14"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <msub>
                                    <mi>y</mi>
                                    <msub>
                                        <mi>x</mi>
                                        <mn>2</mn>
                                    </msub>
                                </msub>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>26</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex7.png"
                                alt="TeXbook, 16.4-16.5"
                                width="90"
                                height="23"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <mrow>
                                    <msubsup>
                                        <mi>x</mi>
                                        <mn>92</mn>
                                        <mn>31415</mn>
                                    </msubsup>
                                    <mo>+</mo>
                                    <mi>π</mi>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>27</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex8.png"
                                alt="TeXbook, 16.4-16.5"
                                width="27"
                                height="36"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <msubsup>
                                    <mi>x</mi>
                                    <msubsup>
                                        <mi>y</mi>
                                        <mi>b</mi>
                                        <mi>a</mi>
                                    </msubsup>
                                    <msubsup>
                                        <mi>z</mi>
                                        <mi>c</mi>
                                        <mi>d</mi>
                                    </msubsup>
                                </msubsup>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>28</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/ex9.png"
                                alt="TeXbook, 16.4-16.5"
                                width="24"
                                height="22"
                            />
                        </td>
                        <td>
                            <math display="block">
                                <msubsup>
                                    <mi>y</mi>
                                    <mn>3</mn>
                                    <mo>‴</mo>
                                </msubsup>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>29</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/stirling29.png"
                                alt="Stirling's approximation"
                                width="194"
                                height="58"
                            />
                        </td>
                        <td>
                            <math
                                display="block"
                                xmlns="http://www.w3.org/1998/Math/MathML"
                            >
                                <mrow>
                                    <munder>
                                        <mo lspace="0em" rspace="0em">
                                            lim
                                        </mo>
                                        <mrow>
                                            <mi>n</mi>
                                            <mo stretchy="false">→</mo>
                                            <mo>+</mo>
                                            <mn>∞</mn>
                                        </mrow>
                                    </munder>
                                    <mfrac>
                                        <msqrt>
                                            <mrow>
                                                <mn>2</mn>
                                                <mi>π</mi>
                                                <mi>n</mi>
                                            </mrow>
                                        </msqrt>
                                        <mrow>
                                            <mi>n</mi>
                                            <mo>!</mo>
                                        </mrow>
                                    </mfrac>
                                    <msup>
                                        <mrow>
                                            <mo>(</mo>
                                            <mfrac>
                                                <mi>n</mi>
                                                <mi>e</mi>
                                            </mfrac>
                                            <mo>)</mo>
                                        </mrow>
                                        <mi>n</mi>
                                    </msup>
                                </mrow>
                                <mo>=</mo>
                                <mn>1</mn>
                            </math>
                        </td>
                    </tr>
                    <tr>
                        <td>30</td>
                        <td>
                            <img
                                src="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/resources/determinant30.png"
                                alt="Leibniz formula for the determinant"
                                width="194"
                                height="58"
                            />
                        </td>
                        <td>
                            <math
                                display="block"
                                xmlns="http://www.w3.org/1998/Math/MathML"
                            >
                                <mrow>
                                    <mrow>
                                        <mo lspace="0em" rspace="0em">
                                            det
                                        </mo>
                                        <mo stretchy="false">(</mo>
                                        <mi>A</mi>
                                        <mo stretchy="false">)</mo>
                                    </mrow>
                                    <mo>=</mo>
                                    <munder>
                                        <mo>∑</mo>
                                        <mrow>
                                            <mi>σ</mi>
                                            <mo>∊</mo>
                                            <msub>
                                                <mi>S</mi>
                                                <mi>n</mi>
                                            </msub>
                                        </mrow>
                                    </munder>
                                    <mrow>
                                        <mi>ϵ</mi>
                                        <mo stretchy="false">(</mo>
                                        <mi>σ</mi>
                                        <mo stretchy="false">)</mo>
                                    </mrow>
                                    <mrow>
                                        <munderover>
                                            <mo>∏</mo>
                                            <mrow>
                                                <mi>i</mi>
                                                <mo>=</mo>
                                                <mn>1</mn>
                                            </mrow>
                                            <mi>n</mi>
                                        </munderover>
                                        <msub>
                                            <mi>a</mi>
                                            <mrow>
                                                <mi>i</mi>
                                                <mo>,</mo>
                                                <msub>
                                                    <mi>σ</mi>
                                                    <mi>i</mi>
                                                </msub>
                                            </mrow>
                                        </msub>
                                    </mrow>
                                </mrow>
                            </math>
                        </td>
                    </tr>
                </tbody>
            </table>
        </>
    );
}
