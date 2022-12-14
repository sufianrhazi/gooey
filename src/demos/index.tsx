import Gooey, { mount } from '..';
import testManifest from '../../test-manifest.json';
import demosManifest from '../../demos-manifest.json';

mount(
    document.body,
    <>
        <h1>Index</h1>
        <ul id="index">
            <li>
                <a
                    href={`/node_modules/@srhazi/gooey-test/dist/testrunner/testrunner.html#${testManifest
                        .map((item) => item.src)
                        .join(':')}`}
                >
                    Test runner
                </a>
            </li>
            {demosManifest
                .sort((a, b) => (a.src < b.src ? -1 : a.src > b.src ? 1 : 0))
                .map((demoEntry) => (
                    <li>
                        <a href={demoEntry.src}>Demo: {demoEntry.src}</a>
                    </li>
                ))}
        </ul>
    </>
);
