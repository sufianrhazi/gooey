import Gooey, { calc, mount, model } from '../..';

const app = document.getElementById('app');
if (!app) throw new Error('app not found');

const getResults = (perfInfo: any[], type: 'perf' | 'used') => {
    const record = perfInfo.find((r) => r.type === type);
    if (record === undefined) return { avg: NaN, median: NaN };
    const values = record.value;
    values.sort((a: number, b: number) => a - b);
    let total = 0;
    values.forEach((val: number) => (total += val));
    const avg = total / values.length;
    const median =
        (values[Math.floor(values.length / 2)] +
            values[Math.ceil(values.length / 2)]) /
        2;
    return { avg, median };
};

const div = (num: any[], denom: any[], type: 'perf' | 'used') => {
    const a = getResults(num, type);
    const b = getResults(denom, type);
    return { avg: a.avg / b.avg, median: a.median / b.median };
};

const Result = ({ avg, median }: { avg: number; median: number }) => {
    return (
        <>
            <div>Average: {avg.toFixed(3)}</div>
            <div>Median: {median.toFixed(3)}</div>
        </>
    );
};

const Results = ({ oneData, twoData }: { oneData: any; twoData: any }) => {
    const oneParsed = new Map<string, any>();
    const twoParsed = new Map<string, any>();
    const keys = new Set<string>();

    oneData.forEach((item: any) => {
        const key = `${item.testFileSrc}:${item.testSuiteName}:${item.testTestName}`;
        keys.add(key);
        oneParsed.set(key, item);
    });
    twoData.forEach((item: any) => {
        const key = `${item.testFileSrc}:${item.testSuiteName}:${item.testTestName}`;
        keys.add(key);
        twoParsed.set(key, item);
    });

    return (
        <table>
            <tr>
                <td />
                <td />
                <th>Clock One</th>
                <th>Clock Two</th>
                <th>Clock Two / One</th>
                <th>Memory One</th>
                <th>Memory Two</th>
                <th>Memory Two / One</th>
            </tr>
            {[...keys].map((key) => {
                const one = oneParsed.get(key);
                const two = twoParsed.get(key);
                const item = one || two;
                if (!item) return;
                return (
                    <tr>
                        <th>{item.testFileSrc}</th>
                        <th>
                            {item.testSuiteName} - {item.testTestName}
                        </th>
                        <td>
                            {one?.perfInfo && (
                                <Result {...getResults(one.perfInfo, 'perf')} />
                            )}
                        </td>
                        <td>
                            {two?.perfInfo && (
                                <Result {...getResults(two.perfInfo, 'perf')} />
                            )}
                        </td>
                        <td>
                            {one?.perfInfo && two?.perfInfo && (
                                <Result
                                    {...div(two.perfInfo, one.perfInfo, 'perf')}
                                />
                            )}
                        </td>
                        <td>
                            {one?.perfInfo && (
                                <Result {...getResults(one.perfInfo, 'used')} />
                            )}
                        </td>
                        <td>
                            {two?.perfInfo && (
                                <Result {...getResults(two.perfInfo, 'used')} />
                            )}
                        </td>
                        <td>
                            {one?.perfInfo && two?.perfInfo && (
                                <Result
                                    {...div(two.perfInfo, one.perfInfo, 'used')}
                                />
                            )}
                        </td>
                    </tr>
                );
            })}
        </table>
    );
};

const PerfCompare = () => {
    const state = model({
        one: '',
        two: '',
    });
    return (
        <>
            <h1>Performance comparison</h1>
            <fieldset>
                <legend>Comparison Data</legend>
                <p>
                    <label>
                        Case One:{' '}
                        <input
                            type="text"
                            on:input={(e) => {
                                if (e.target instanceof HTMLInputElement) {
                                    state.one = e.target.value;
                                }
                            }}
                        />
                    </label>
                </p>
                <p>
                    <label>
                        Case Two:{' '}
                        <input
                            type="text"
                            on:input={(e) => {
                                if (e.target instanceof HTMLInputElement) {
                                    state.two = e.target.value;
                                }
                            }}
                        />
                    </label>
                </p>
            </fieldset>
            {calc(() => {
                if (!state.one || !state.two) return null;
                try {
                    const oneData = JSON.parse(state.one);
                    const twoData = JSON.parse(state.two);
                    return <Results oneData={oneData} twoData={twoData} />;
                } catch (e) {
                    return null;
                }
            })}
        </>
    );
};

mount(app, <PerfCompare />);
