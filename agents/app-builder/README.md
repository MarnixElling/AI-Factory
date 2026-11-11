# App builder

A repository-local CLI that uses Gemini through the Vercel AI SDK to create a
Nuxt 4 SPA. It runs three phases in order: base app, design system, then pages.
Each phase is implemented by an executor and independently reviewed by a
read-only reviewer. Requested changes are sent back to the executor; the next
phase starts only after approval with no findings. A phase stops after three
unsuccessful reviews or immediately if an agent reports a blocker.

The executor can write only under the selected new `apps/<appName>` directory.
The agents can also read `layers/ui-base` and `layers/configs` when present.
The reviewer has no write tools. These restrictions are enforced by the
provided filesystem tools, not by an operating-system sandbox. The builder
does not run shell commands, install generated app dependencies, or execute
generated code.

The config layer is optional until it exists. If it is missing, the builder
warns and asks the executor not to extend it. The current `ui-base` layer must
provide the components needed by the design; missing components are a
blocker rather than permission to modify the layer.

## Setup

From this directory, install the builder's isolated dependencies:

```powershell
yarn install
$env:GOOGLE_GENERATIVE_AI_API_KEY = '<your Google AI Studio API key>'
```

The default model is `gemini-2.5-flash`. Override it with
`$env:APP_BUILDER_MODEL = '<model-id>'` if your Google account has access to a
different compatible Gemini model. Availability, free-tier quotas and pricing
depend on Google and can change. Reviews, revisions, tool calls and images all
consume tokens; each agent is limited to 30 steps per invocation, but this is
not a spending limit. Check your provider's quota and billing settings.

**Data handling:** Running the CLI sends the supplied manifest, exported
design images, agent prompts, and files read by the agents to Google. Do not
include secrets, personal data, or confidential material that must not be sent
to the provider. The CLI blocks common secret and dependency paths, but that
is not a complete sensitive-data filter.

## Input manifest

Export the Figma frames as PNG, JPEG or WebP images. Place a JSON manifest
alongside the exports, using relative paths without `..` or symbolic links.
Each file must be at most 5 MB; all distinct images and listed assets together
must be at most 15 MB. Explicitly pair mobile and desktop frames for each
route, provide metadata, and list middleware requirements. Use an empty
middleware array when none is required.

```json
{
  "appName": "example-site",
  "brief": "Describe the website, its content, and desired behaviour.",
  "designNotes": "Describe colors, fonts, interactions and responsive rules.",
  "assets": ["assets/logo.png"],
  "pages": [
    {
      "name": "Home",
      "route": "/",
      "mobile": "frames/home-mobile.png",
      "desktop": "frames/home-desktop.png",
      "middleware": [],
      "title": "Example home",
      "description": "A factual description of the home page."
    }
  ]
}
```

`assets` is optional and identifies reusable PNG, JPEG, WebP, WOFF, WOFF2,
TTF, or OTF files the executor can copy to the app's `public` directory;
screenshots are not copied automatically. Supply only fonts you are licensed
to use.
Supply text descriptions and facts rather than asking the agent to guess
business requirements, guard logic, font licensing, or SEO claims. If a
necessary input is absent, the executor should stop with a blocker.

## Run and verify

```powershell
yarn build-app 'C:\path\to\manifest.json'
```

The app must not already exist. An interrupted or blocked run leaves its
partial app in place. After addressing an external blocker, rerun with
`--resume` and the same manifest and unchanged images:

```powershell
yarn build-app 'C:\path\to\manifest.json' --resume
```

Resume starts again at the first phase; the run marker prevents resuming an
unrelated existing app or silently changing inputs. No generated files are
deleted. A reviewer approval is an AI judgment, not a build or test result.
Inspect the generated code, install its dependencies using the repository's
workflow, and run its lint, type-check, tests and build before using it.

Nuxt SPA metadata is client-rendered. Verify crawler support, prerendering and
hosting separately; metadata alone cannot guarantee SEO or GEO/AIO outcomes.

To validate the builder itself, run `yarn check` from this directory. The
repository's root workspace check does not include this isolated package.
