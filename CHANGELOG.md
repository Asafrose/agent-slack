# Changelog

## [0.3.4](https://github.com/Asafrose/agent-slack/compare/v0.3.3...v0.3.4) (2026-02-22)


### Bug Fixes

* correct Slack API usage across multiple commands ([4d3578d](https://github.com/Asafrose/agent-slack/commit/4d3578da16c0b72474aef45c859db56b8f1cee04))

## [0.3.3](https://github.com/Asafrose/agent-slack/compare/v0.3.2...v0.3.3) (2026-02-21)


### Bug Fixes

* use "./" instead of "." for marketplace plugin source ([f0cbfe6](https://github.com/Asafrose/agent-slack/commit/f0cbfe63ad22054ae894d75a233425a1fd2e5db6))
* use "./" instead of "." for marketplace plugin source ([00bb94c](https://github.com/Asafrose/agent-slack/commit/00bb94c5fae6cf1209664630fde7f8c8d942b5f7))

## [0.3.2](https://github.com/Asafrose/agent-slack/compare/v0.3.1...v0.3.2) (2026-02-21)


### Bug Fixes

* **ci:** use Node 24 for npm OIDC trusted publishing ([74b1e6d](https://github.com/Asafrose/agent-slack/commit/74b1e6da9ef197ad6fa5c808a07b14dba22a2864))
* **ci:** use Node 24 for npm OIDC trusted publishing ([b119cd4](https://github.com/Asafrose/agent-slack/commit/b119cd44f8f1ddd18212ba10af96e96020092cab))

## [0.3.1](https://github.com/Asafrose/agent-slack/compare/v0.3.0...v0.3.1) (2026-02-21)


### Bug Fixes

* **ci:** use GH_PAT in release-please to trigger downstream workflows ([5e13f86](https://github.com/Asafrose/agent-slack/commit/5e13f86f9d3cca4212877725ae7d2bbfac2fcfea))
* **ci:** use GH_PAT in release-please to trigger downstream workflows ([859a163](https://github.com/Asafrose/agent-slack/commit/859a163b194bb53501d77d013ab8dff7941d5299))

## [0.3.0](https://github.com/Asafrose/agent-slack/compare/v0.2.0...v0.3.0) (2026-02-19)


### Features

* add "sent by agent-slack" footer to outgoing messages ([229b1fa](https://github.com/Asafrose/agent-slack/commit/229b1fa6f1bf620379b16de11d5ecdb3b9b313d7))
* add sent-by-agent-slack footer to outgoing messages ([ec225b5](https://github.com/Asafrose/agent-slack/commit/ec225b5118bb5d146d2601d00911c44e8c3a6521))


### Bug Fixes

* **ci:** trigger CI on release-please branch pushes ([534eb68](https://github.com/Asafrose/agent-slack/commit/534eb68f00e1cf20086e502c01104b35c82b5a09))
* **ci:** use GH_PAT in release-please to trigger CI on release PRs ([59fc991](https://github.com/Asafrose/agent-slack/commit/59fc9917f8a6819020cbb43adc15ddd1d4aeae91))
* **ci:** use GH_PAT in release-please to trigger CI on release PRs ([a1a1f85](https://github.com/Asafrose/agent-slack/commit/a1a1f857aec3d0f2a7d9ae7f28bcb88dbf625a77))

## [0.2.0](https://github.com/Asafrose/agent-slack/compare/v0.1.0...v0.2.0) (2026-02-19)


### Features

* add OAuth login/logout via Cloudflare Worker + migrate to async Bun file APIs ([b93a2af](https://github.com/Asafrose/agent-slack/commit/b93a2afa3c47619dd77d6a45b4b3b90115d0da00))


### Bug Fixes

* route OAuth callback through worker for HTTPS redirect URL ([f8bba73](https://github.com/Asafrose/agent-slack/commit/f8bba73a168766afb483dad716bcf9b04394acc9))
