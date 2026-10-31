<script setup lang="ts">
const shot = (name: string) => `/readme/${name}`

const copy = {
  stories: [
    {
      eyebrow: 'Independent workspace',
      title: 'Not another tab.\nNot another IDE plugin.',
      body: 'Projects, sessions, reviews, previews, and agents live in one persistent desktop space.',
      image: shot('chat_en.webp'),
      alt: 'Persistent sessions',
    },
    {
      eyebrow: 'Plugin-powered',
      title: 'The Core is the base.\nYou assemble the rest.',
      body: 'Panels, views, widgets, tools, MCP servers, themes, and services — all pluggable.',
      image: shot('plugins_en.webp'),
      alt: 'Plugin market',
    },
    {
      eyebrow: 'Agent orchestration',
      title: 'One agent\nis not enough.',
      body: 'Subagents take independent work. Worker Sessions carry longer flows in parallel.',
      image: shot('session-orchestrator-overview.webp'),
      alt: 'Multi-agent orchestration',
    },
    {
      eyebrow: 'Model freedom',
      title: 'Models are parts.\nThe workflow is yours.',
      body: 'Cloud, local, custom gateways, compatible APIs. Swap models without rebuilding.',
      image: shot('model_en.webp'),
      alt: 'Model switching',
    },
  ],
  modes: [
    { label: 'Agent', text: 'Just execute. For everyday development.' },
    { label: 'Plan', text: 'Review first. For refactors and high-risk changes.' },
    { label: 'Goal', text: 'Lock the outcome. For complex, long-running work.' },
  ],
  modesTitle: 'Three rhythms.\nOne workspace.',
  galleryTitle: 'See it work.',
  gallery: [
    { src: shot('session-orchestrator-overview.webp'), alt: 'Session Orchestrator' },
    { src: shot('session-orchestrator-worker.webp'), alt: 'Worker Session' },
    { src: shot('addmodel_en.webp'), alt: 'Custom providers' },
    { src: shot('chat_en.webp'), alt: 'Persistent sessions' },
  ],
  localTitle: 'Local-first.',
  localBody:
    'Projects, sessions, and settings stay local by default. No mandatory account. No mandatory relay. Credentials live in the OS keychain. Model requests go straight to your provider.',
  stepsTitle: 'Four steps.',
  steps: ['Download', 'Connect a model', 'Open a project', 'Start working'],
  ctaTitle: 'Put agents\nin a workspace.',
  ctaBody: 'macOS · Windows · Linux',
  download: 'Download',
  docs: 'Documentation',
  downloadHref: 'https://nib.am/download.html',
  docsHref: '/guide/',
}
</script>

<template>
  <div class="launch">
    <section
      v-for="(story, index) in copy.stories"
      :key="story.eyebrow"
      class="story"
      :class="index % 2 === 1 ? 'story--flip' : ''"
    >
      <div class="story__copy">
        <p class="story__eyebrow">{{ story.eyebrow }}</p>
        <h2 class="story__title">
          <template v-for="(line, i) in story.title.split('\n')" :key="i">
            <span>{{ line }}</span>
          </template>
        </h2>
        <p class="story__body">{{ story.body }}</p>
      </div>
      <div class="story__visual">
        <img :src="story.image" :alt="story.alt" loading="lazy" decoding="async" />
      </div>
    </section>

    <section class="modes">
      <h2 class="modes__title">
        <template v-for="(line, i) in copy.modesTitle.split('\n')" :key="i">
          <span>{{ line }}</span>
        </template>
      </h2>
      <div class="modes__list">
        <article v-for="mode in copy.modes" :key="mode.label" class="mode">
          <h3>{{ mode.label }}</h3>
          <p>{{ mode.text }}</p>
        </article>
      </div>
    </section>

    <section class="gallery">
      <h2 class="gallery__title">{{ copy.galleryTitle }}</h2>
      <div class="gallery__rail">
        <figure v-for="item in copy.gallery" :key="item.src" class="gallery__item">
          <img :src="item.src" :alt="item.alt" loading="lazy" decoding="async" />
        </figure>
      </div>
    </section>

    <section class="local">
      <h2 class="local__title">{{ copy.localTitle }}</h2>
      <p class="local__body">{{ copy.localBody }}</p>
    </section>

    <section class="steps">
      <h2 class="steps__title">{{ copy.stepsTitle }}</h2>
      <ol class="steps__list">
        <li v-for="(step, index) in copy.steps" :key="step">
          <span class="steps__index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="steps__label">{{ step }}</span>
        </li>
      </ol>
    </section>

    <section class="finale">
      <h2 class="finale__title">
        <template v-for="(line, i) in copy.ctaTitle.split('\n')" :key="i">
          <span>{{ line }}</span>
        </template>
      </h2>
      <p class="finale__body">{{ copy.ctaBody }}</p>
      <div class="finale__actions">
        <a class="pill pill--solid" :href="copy.downloadHref">{{ copy.download }}</a>
        <a class="pill pill--ghost" :href="copy.docsHref">{{ copy.docs }}</a>
      </div>
    </section>
  </div>
</template>
