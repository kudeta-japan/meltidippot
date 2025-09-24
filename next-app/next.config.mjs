const repo = 'meltidippot';

/** @type {import('next').NextConfig} */
export default {
  // GitHub Pages で配信するための静的エクスポート設定
  output: 'export',
  // リポ名を必ず入れる（ここが違うとCSSや画像が読めません）
  basePath: `/${repo}`,
  assetPrefix: `/${repo}/`,
  // next/image を最適化なしで出す（Pages でもそのまま表示できる）
  images: { unoptimized: true },
};
