<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Auralis - AI Voice Infrastructure</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "surface-container": "#eeeeee",
                      "secondary-fixed": "#e4e2e2",
                      "inverse-on-surface": "#f0f1f1",
                      "surface-tint": "#5f5e5e",
                      "on-tertiary-fixed": "#07006c",
                      "on-surface": "#1a1c1c",
                      "on-tertiary-fixed-variant": "#2f2ebe",
                      "on-error": "#ffffff",
                      "surface-container-highest": "#e2e2e2",
                      "surface-container-high": "#e8e8e8",
                      "tertiary": "#000000",
                      "on-secondary-container": "#626262",
                      "secondary-fixed-dim": "#c7c6c6",
                      "on-secondary-fixed-variant": "#464747",
                      "on-primary": "#ffffff",
                      "on-surface-variant": "#444748",
                      "tertiary-fixed-dim": "#c0c1ff",
                      "on-background": "#1a1c1c",
                      "on-primary-fixed-variant": "#474646",
                      "primary-fixed-dim": "#c8c6c5",
                      "on-tertiary-container": "#7073ff",
                      "outline": "#747878",
                      "on-secondary": "#ffffff",
                      "primary-fixed": "#e5e2e1",
                      "on-error-container": "#93000a",
                      "on-primary-container": "#858383",
                      "primary-container": "#1c1b1b",
                      "on-tertiary": "#ffffff",
                      "inverse-surface": "#2f3131",
                      "on-primary-fixed": "#1c1b1b",
                      "secondary-container": "#e1dfdf",
                      "background": "#f9f9f9",
                      "surface-container-lowest": "#ffffff",
                      "error": "#ba1a1a",
                      "secondary": "#5e5e5e",
                      "tertiary-container": "#07006c",
                      "outline-variant": "#c4c7c7",
                      "surface-dim": "#dadada",
                      "surface": "#f9f9f9",
                      "tertiary-fixed": "#e1e0ff",
                      "error-container": "#ffdad6",
                      "surface-bright": "#f9f9f9",
                      "primary": "#000000",
                      "surface-variant": "#e2e2e2",
                      "inverse-primary": "#c8c6c5",
                      "surface-container-low": "#f3f3f3",
                      "on-secondary-fixed": "#1b1c1c"
              },
              "borderRadius": {
                      "DEFAULT": "0.25rem",
                      "lg": "0.5rem",
                      "xl": "0.75rem",
                      "full": "9999px"
              },
              "spacing": {
                      "grid-columns": "12",
                      "gutter": "24px",
                      "section-padding": "150px",
                      "internal-padding-xs": "8px",
                      "internal-padding-md": "20px",
                      "internal-padding-sm": "12px",
                      "container-max-width": "1440px"
              },
              "fontFamily": {
                      "body": [
                              "Geist", "Inter", "sans-serif"
                      ],
                      "h3": [
                              "Geist", "Inter", "sans-serif"
                      ],
                      "button": [
                              "Geist", "Inter", "sans-serif"
                      ],
                      "label-caps": [
                              "Geist", "Inter", "sans-serif"
                      ],
                      "h1": [
                              "Geist", "Inter", "sans-serif"
                      ],
                      "h2": [
                              "Geist", "Inter", "sans-serif"
                      ]
              },
              "fontSize": {
                      "body": [
                              "17px",
                              {
                                      "lineHeight": "1.6",
                                      "letterSpacing": "0em",
                                      "fontWeight": "400"
                              }
                      ],
                      "h3": [
                              "28px",
                              {
                                      "lineHeight": "1.2",
                                      "letterSpacing": "-0.01em",
                                      "fontWeight": "500"
                              }
                      ],
                      "button": [
                              "14px",
                              {
                                      "lineHeight": "1.0",
                                      "letterSpacing": "0.01em",
                                      "fontWeight": "500"
                              }
                      ],
                      "label-caps": [
                              "12px",
                              {
                                      "lineHeight": "1.0",
                                      "letterSpacing": "0.05em",
                                      "fontWeight": "600"
                              }
                      ],
                      "h1": [
                              "84px",
                              {
                                      "lineHeight": "0.95",
                                      "letterSpacing": "-0.04em",
                                      "fontWeight": "600"
                              }
                      ],
                      "h2": [
                              "48px",
                              {
                                      "lineHeight": "1.1",
                                      "letterSpacing": "-0.02em",
                                      "fontWeight": "600"
                              }
                      ]
              }
      },
          },
        }
    </script>
<style>
        body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .filled-icon {
             font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="bg-surface font-body text-body text-on-surface">
<!-- TopNavBar -->
<nav class="fixed top-0 w-full z-50 border-b border-surface-variant bg-surface/80 backdrop-blur-xl transition-all shadow-sm">
<div class="max-w-[1280px] mx-auto px-6 h-20 flex justify-between items-center">
<!-- Brand -->
<a class="text-xl font-bold tracking-tighter text-on-surface" href="#">
                Auralis
            </a>
<!-- Navigation Links (Web) -->
<div class="hidden md:flex items-center space-x-8">
<a class="tracking-tight font-medium text-sm text-on-surface font-semibold border-b-2 border-on-surface pb-1 active:scale-95 duration-200 ease-in-out" href="#">Models</a>
<a class="tracking-tight font-medium text-sm text-outline hover:text-on-surface transition-colors hover:opacity-80 transition-opacity active:scale-95 duration-200 ease-in-out" href="#">API</a>
<a class="tracking-tight font-medium text-sm text-outline hover:text-on-surface transition-colors hover:opacity-80 transition-opacity active:scale-95 duration-200 ease-in-out" href="#">Voice Lab</a>
<a class="tracking-tight font-medium text-sm text-outline hover:text-on-surface transition-colors hover:opacity-80 transition-opacity active:scale-95 duration-200 ease-in-out" href="#">Enterprise</a>
<a class="tracking-tight font-medium text-sm text-outline hover:text-on-surface transition-colors hover:opacity-80 transition-opacity active:scale-95 duration-200 ease-in-out" href="#">Pricing</a>
</div>
<!-- Primary Action -->
<div class="hidden md:flex items-center">
<button class="bg-primary text-on-primary font-button text-button px-6 py-3 rounded-full hover:opacity-90 transition-opacity active:scale-95 duration-200">
                    Get Started
                </button>
</div>
<!-- Mobile Menu Toggle -->
<button class="md:hidden text-on-surface">
<span class="material-symbols-outlined text-2xl">menu</span>
</button>
</div>
</nav>
<!-- Main Content Canvas -->
<main class="pt-32 pb-32">
<!-- Hero Section -->
<section class="max-w-[1280px] mx-auto px-6 flex flex-col items-center text-center mt-12 mb-[150px]">
<div class="inline-flex items-center space-x-2 bg-surface-container-high px-4 py-2 rounded-full mb-8 border border-outline-variant">
<span class="bg-tertiary text-on-tertiary text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">New</span>
<span class="text-sm font-medium text-on-surface">Auralis v2.0 is now live</span>
<span class="material-symbols-outlined text-sm text-outline">arrow_forward</span>
</div>
<h1 class="font-h1 text-h1 text-on-surface max-w-[900px] mb-8">
                Create AI audio that sounds human
            </h1>
<p class="font-body text-body text-on-surface-variant max-w-[620px] mb-12">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
<div class="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-24">
<button class="bg-primary text-on-primary font-button text-button px-8 py-4 rounded-full hover:opacity-90 transition-opacity w-full sm:w-auto">
                    Start Building
                </button>
<button class="bg-transparent border border-outline-variant text-on-surface font-button text-button px-8 py-4 rounded-full hover:bg-surface-container transition-colors w-full sm:w-auto">
                    Explore Platform
                </button>
</div>
<!-- Hero Demo UI -->
<div class="w-full max-w-[1024px] bg-surface-container-lowest border border-outline-variant rounded-2xl p-2 shadow-sm">
<div class="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/50 relative aspect-[16/9]">
<img alt="Abstract gradient representing sound waves" class="w-full h-full object-cover opacity-80 mix-blend-multiply" data-alt="A highly detailed, ultra-modern interface displaying abstract, smooth gradient soundwaves in deep indigo and charcoal tones on a pristine white background. The aesthetic is clean, minimalist, and engineered, simulating professional AI audio software. Soft, ambient lighting creates a subtle glassmorphic depth. Precise, technical grid lines and minimalist playback controls are integrated seamlessly." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDt3qZ7fFv7mzDjeewCnbjQTTcH04fSkloanD4bfVM90-2PYG__CVQ-N8TcLY9tEmAg2QbBhpoOz4iaEmun7jp-asXydQCua3dFKrV8Zp3Q32WW8YyxGzV5tWlg2tWF6jclRMflBEXtP6BAGuePA4EHdx4u5WThcF51oAi8tVuWsFnu7QmUWMsw9Xg22VvlCF6lHZLevGGqrcw6wB-D8bcqFx5_Irm_JCT1uL-tyCS42B0Gctto69bo1dLDVK2vzVkfENIhpZO_Er8"/>
<div class="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-surface-container-lowest to-transparent">
<div class="bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant rounded-lg p-4 flex items-center justify-between">
<div class="flex items-center space-x-4">
<button class="bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center">
<span class="material-symbols-outlined filled-icon">play_arrow</span>
</button>
<div>
<div class="text-sm font-medium text-on-surface">Synthesized Voice Output</div>
<div class="text-xs text-on-surface-variant">Model: Aura-v2-English</div>
</div>
</div>
<div class="flex space-x-1">
<div class="w-1 h-6 bg-primary rounded-full animate-pulse"></div>
<div class="w-1 h-8 bg-primary rounded-full animate-pulse delay-75"></div>
<div class="w-1 h-4 bg-primary rounded-full animate-pulse delay-150"></div>
<div class="w-1 h-7 bg-primary rounded-full animate-pulse delay-200"></div>
<div class="w-1 h-5 bg-outline rounded-full"></div>
<div class="w-1 h-3 bg-outline rounded-full"></div>
<div class="w-1 h-2 bg-outline rounded-full"></div>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- Trust Strip -->
<section class="max-w-[1280px] mx-auto px-6 py-[80px] mb-[150px] border-y border-surface-variant">
<p class="text-center text-sm font-medium text-outline mb-8 uppercase tracking-widest">Trusted by industry leaders</p>
<div class="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale">
<img alt="Company Logo" class="h-6 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARnFdyve3SzpPqkpXNyRCMwKuzXUczIMAeA5pvvf9h89HQ5KnlobueNqAMKOvCZmLNwKhzAFF5Z-rDbjiJfPD7lj8A6aUE1hYHdK6kw9eDLfgDxsIkKtLwNmqV9mUdNyc_rGhmMZvxLlqcHa-N1rW7ZMu4jTuSgJXsKXIPJiydFNyK7aauD1Nk61P_2jmPgrTGQVJgRDxCQGEs-Hk_s16iEljjQMHwW6TOcxlIaUZ8JqaD6XoI7VrYbc7n8dcPg-H-jMpfC7qUtUY"/>
<img alt="Company Logo" class="h-6 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDruTgR9xfDQmptUuRORzMnQjqXDTkWI6HSm3FPMeEcYYghbQzmWADnDWQUen6eqtEUPX1_nJ-4Q-RnoeRHRh_LBYmnWtmX3oApsIju1y7QxyaPbbOpAkZcU1r7KXxXcSAHoLxOf4C3OvLHa4MfqE4SeHeIFvjUN04QuQ8zhpsNZhTvneFOBEnBUz8fGUaaqnIXK6GbTP-tU1pPBe8ClQyGMyS7I8l2uIr7iHsQ0cLwI0TpyZL2fgPDBY30TloRfE3iFT_LFXSiL-A"/>
<img alt="Company Logo" class="h-6 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbB_aAFfK30XyhEV0VGm4JfqWNcX5915WoOjre-_5jHVA86aou3Ujc37Nuk5yKdWUbO8jiWE37lf3Rq8_yfTM7Y-uF6O5k6fNar55jCQN7REcI_3jZ3WhNkcj_tWVQxBDzhNOu9R4xFg9hEZWDKcEpXb8laDW3h4PSVxTQYDIyqvzGEu9nq61b7uymaVn1Lsuv8ehAwkW61F8TTZrZjM6ZC3hq8zcqWdlnk8EIl0KPy7NMw_6j0hz8Bnsv6u6DHGH5nJNNY5Wzps0"/>
<img alt="Company Logo" class="h-8 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjtg6j58nG5E0jOFUMYmvkltXLAdiobgtmVEBKHRvmqPa07lGjIiyah-AWSVy6CdIdNqeslPYlMcz3kvHqMwW2KeKag3s5LcuKib1AO_GhAR6MBojfEQ0DJ_yFQBYdtuj0kCCIUxsN5EvFtv2NX0A4W-AxHqANy8cQsCjX2FYPUNBLRC0qUcpqZnYU_8RYYr_dbufXMhNb6U00wb4_Y4kcsnXaiXKkoUKC-1AMaiXVP20I906SRnM-LiJXgPcMUQ3FT80wWPobNgE"/>
<img alt="Company Logo" class="h-8 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAh80yS6CG2xmqNs7Gb8ke8X6wEXuurWSVOH7vCBUwXvaJ7uxCyRQ6yhv3_OaQ_gG4Jc1_o8n60EtCShiLuJ91Z5pnBhKyh9bXj21uELrvZ1KNNZ_UUgC8BO2fY0YAKOERDtjf1f5vIs4V10NJqNgaIhkKLqzgD2rW9d9raoVgbfsvQUR6EItu2GlhgSaBKr2wMXLtj43T3cC0sHEc9lWr9Lq-5_bEPRcLAJlcVaEL2lIjv5XXjBQFDYy9duiGfVEiR4YwQTSLslEM"/>
</div>
</section>
<!-- Product Grid -->
<section class="max-w-[1280px] mx-auto px-6 mb-[150px]">
<div class="text-center mb-16">
<h2 class="font-h2 text-h2 text-on-surface mb-4">Modular Audio Intelligence</h2>
<p class="font-body text-body text-on-surface-variant max-w-[600px] mx-auto">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore.
                </p>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<!-- Card 1 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[24px] p-6 hover:shadow-sm transition-shadow duration-300 group flex flex-col h-full">
<div class="mb-6 bg-surface-container h-40 rounded-xl overflow-hidden flex items-center justify-center relative">
<span class="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors">record_voice_over</span>
</div>
<h3 class="font-h3 text-h3 text-on-surface mb-2 text-xl">Text to Speech</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-4 flex-grow">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                    </p>
<a class="text-sm font-medium text-primary hover:underline inline-flex items-center" href="#">
                        Explore TTS <span class="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
</a>
</div>
<!-- Card 2 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[24px] p-6 hover:shadow-sm transition-shadow duration-300 group flex flex-col h-full">
<div class="mb-6 bg-surface-container h-40 rounded-xl overflow-hidden flex items-center justify-center relative">
<span class="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors">graphic_eq</span>
</div>
<h3 class="font-h3 text-h3 text-on-surface mb-2 text-xl">Speech to Text</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-4 flex-grow">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                    </p>
<a class="text-sm font-medium text-primary hover:underline inline-flex items-center" href="#">
                        Explore STT <span class="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
</a>
</div>
<!-- Card 3 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[24px] p-6 hover:shadow-sm transition-shadow duration-300 group flex flex-col h-full">
<div class="mb-6 bg-surface-container h-40 rounded-xl overflow-hidden flex items-center justify-center relative">
<span class="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors">content_copy</span>
</div>
<h3 class="font-h3 text-h3 text-on-surface mb-2 text-xl">Voice Cloning</h3>
<p class="text-on-surface-variant text-sm leading-relaxed mb-4 flex-grow">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                    </p>
<a class="text-sm font-medium text-primary hover:underline inline-flex items-center" href="#">
                        Explore Cloning <span class="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
</a>
</div>
</div>
</section>
<!-- 1. Product Deep Dive -->
<section class="max-w-[1280px] mx-auto px-6 mb-[150px] grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
<div class="md:col-span-5 flex flex-col space-y-6">
<span class="font-label-caps text-label-caps text-outline uppercase tracking-widest">Precision Control</span>
<h2 class="font-h2 text-h2 text-on-surface">Fine-tune every syllable</h2>
<p class="font-body text-body text-on-surface-variant">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </p>
<ul class="space-y-4">
<li class="flex items-start">
<span class="material-symbols-outlined text-primary mr-3 mt-1 text-[20px]">check_circle</span>
<span class="text-on-surface-variant text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span>
</li>
<li class="flex items-start">
<span class="material-symbols-outlined text-primary mr-3 mt-1 text-[20px]">check_circle</span>
<span class="text-on-surface-variant text-sm">Sed do eiusmod tempor incididunt ut labore et dolore.</span>
</li>
<li class="flex items-start">
<span class="material-symbols-outlined text-primary mr-3 mt-1 text-[20px]">check_circle</span>
<span class="text-on-surface-variant text-sm">Ut enim ad minim veniam, quis nostrud exercitation.</span>
</li>
</ul>
</div>
<div class="md:col-span-7 bg-surface-container-low border border-outline-variant rounded-[24px] p-8 shadow-sm relative overflow-hidden">
<div class="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/50 backdrop-blur-xl">
<div class="mb-4 text-xs font-medium text-on-surface-variant tracking-widest uppercase">Transcript Editor</div>
<div class="bg-surface p-4 rounded-lg border border-outline-variant mb-6 text-sm text-on-surface font-mono leading-relaxed">
                "Hello, world. <span class="bg-primary/10 text-primary px-1 rounded">This is</span> a synthesized voice output."
            </div>
<div class="space-y-4 mb-8">
<div>
<div class="flex justify-between text-xs mb-1 text-on-surface-variant"><span>Stability</span><span>75%</span></div>
<div class="h-2 bg-surface-variant rounded-full"><div class="h-full bg-primary rounded-full w-3/4"></div></div>
</div>
<div>
<div class="flex justify-between text-xs mb-1 text-on-surface-variant"><span>Clarity</span><span>90%</span></div>
<div class="h-2 bg-surface-variant rounded-full"><div class="h-full bg-primary rounded-full w-[90%]"></div></div>
</div>
</div>
<div class="flex items-center space-x-4 border-t border-surface-variant pt-4">
<button class="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center"><span class="material-symbols-outlined filled-icon">play_arrow</span></button>
<div class="flex-grow h-1 bg-surface-variant rounded-full relative"><div class="absolute left-0 top-0 h-full w-1/3 bg-primary rounded-full"></div></div>
<span class="text-xs text-on-surface-variant font-mono">0:04 / 0:12</span>
</div>
</div>
</div>
</section>
<!-- 2. Developer/API Section -->
<section class="max-w-[1280px] mx-auto px-6 mb-[150px] grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
<div class="bg-[#111318] rounded-[24px] p-8 overflow-hidden shadow-lg border border-outline-variant/20 order-2 md:order-1">
<div class="flex space-x-2 mb-6">
<div class="w-3 h-3 rounded-full bg-outline-variant/30"></div>
<div class="w-3 h-3 rounded-full bg-outline-variant/30"></div>
<div class="w-3 h-3 rounded-full bg-outline-variant/30"></div>
</div>
<pre class="text-sm font-mono text-on-primary/80 whitespace-pre-wrap"><code><span class="text-on-tertiary-container">import</span> auralis

client = auralis.Client(api_key=<span class="text-secondary-fixed-dim">"YOUR_API_KEY"</span>)

response = client.audio.speech.create(
    model=<span class="text-secondary-fixed-dim">"aura-v2"</span>,
    voice=<span class="text-secondary-fixed-dim">"echo"</span>,
    input=<span class="text-secondary-fixed-dim">"Lorem ipsum dolor sit amet."</span>
)

response.stream_to_file(<span class="text-secondary-fixed-dim">"output.mp3"</span>)</code></pre>
</div>
<div class="flex flex-col space-y-6 order-1 md:order-2">
<h2 class="font-h2 text-h2 text-on-surface">Built for Developers</h2>
<p class="font-body text-body text-on-surface-variant">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </p>
<div class="flex flex-wrap gap-3">
<span class="px-3 py-1 bg-surface-container border border-outline-variant rounded-full text-xs font-medium text-on-surface">Low Latency &lt;50ms</span>
<span class="px-3 py-1 bg-surface-container border border-outline-variant rounded-full text-xs font-medium text-on-surface">REST &amp; WebSocket APIs</span>
<span class="px-3 py-1 bg-surface-container border border-outline-variant rounded-full text-xs font-medium text-on-surface">Python &amp; Node SDKs</span>
</div>
<a class="text-sm font-medium text-primary hover:underline inline-flex items-center mt-4" href="#">
            Read the Documentation <span class="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
</a>
</div>
</section>
<!-- 3. Use Cases Grid -->
<section class="max-w-[1280px] mx-auto px-6 mb-[150px]">
<div class="text-center mb-16">
<h2 class="font-h2 text-h2 text-on-surface mb-4">Endless Applications</h2>
<p class="font-body text-body text-on-surface-variant max-w-[600px] mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore.
        </p>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
<!-- Case 1 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[20px] p-6 hover:bg-surface-container-low transition-colors">
<span class="material-symbols-outlined text-3xl text-outline mb-4">support_agent</span>
<h3 class="font-h3 text-xl text-on-surface mb-2">Voice Assistants</h3>
<p class="text-sm text-on-surface-variant leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>
</div>
<!-- Case 2 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[20px] p-6 hover:bg-surface-container-low transition-colors">
<span class="material-symbols-outlined text-3xl text-outline mb-4">menu_book</span>
<h3 class="font-h3 text-xl text-on-surface mb-2">Audiobooks</h3>
<p class="text-sm text-on-surface-variant leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>
</div>
<!-- Case 3 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[20px] p-6 hover:bg-surface-container-low transition-colors">
<span class="material-symbols-outlined text-3xl text-outline mb-4">translate</span>
<h3 class="font-h3 text-xl text-on-surface mb-2">Localization</h3>
<p class="text-sm text-on-surface-variant leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>
</div>
<!-- Case 4 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[20px] p-6 hover:bg-surface-container-low transition-colors">
<span class="material-symbols-outlined text-3xl text-outline mb-4">sports_esports</span>
<h3 class="font-h3 text-xl text-on-surface mb-2">Gaming</h3>
<p class="text-sm text-on-surface-variant leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>
</div>
<!-- Case 5 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[20px] p-6 hover:bg-surface-container-low transition-colors">
<span class="material-symbols-outlined text-3xl text-outline mb-4">accessibility_new</span>
<h3 class="font-h3 text-xl text-on-surface mb-2">Accessibility</h3>
<p class="text-sm text-on-surface-variant leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>
</div>
<!-- Case 6 -->
<div class="bg-surface-container-lowest border border-outline-variant rounded-[20px] p-6 hover:bg-surface-container-low transition-colors">
<span class="material-symbols-outlined text-3xl text-outline mb-4">podcasts</span>
<h3 class="font-h3 text-xl text-on-surface mb-2">Podcasts</h3>
<p class="text-sm text-on-surface-variant leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>
</div>
</div>
</section>
<!-- 4. Pricing Section -->
<section class="max-w-[1280px] mx-auto px-6 mb-[150px]">
<div class="text-center mb-16">
<h2 class="font-h2 text-h2 text-on-surface mb-4">Simple, Transparent Pricing</h2>
<p class="font-body text-body text-on-surface-variant max-w-[600px] mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
</div>
<div class="flex flex-col lg:flex-row gap-6 justify-center items-stretch">
<!-- Free -->
<div class="flex-1 bg-surface-container-lowest border border-outline-variant rounded-[24px] p-6 flex flex-col">
<h3 class="text-lg font-medium text-on-surface mb-2">Free</h3>
<div class="text-3xl font-bold text-on-surface mb-6">$0<span class="text-sm font-normal text-on-surface-variant">/mo</span></div>
<p class="text-sm text-on-surface-variant mb-6 flex-grow">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
<button class="w-full py-2 px-4 rounded-full border border-outline-variant text-on-surface font-medium hover:bg-surface-container transition-colors">Get Started</button>
</div>
<!-- Starter -->
<div class="flex-1 bg-surface-container-lowest border border-outline-variant rounded-[24px] p-6 flex flex-col">
<h3 class="text-lg font-medium text-on-surface mb-2">Starter</h3>
<div class="text-3xl font-bold text-on-surface mb-6">$29<span class="text-sm font-normal text-on-surface-variant">/mo</span></div>
<p class="text-sm text-on-surface-variant mb-6 flex-grow">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
<button class="w-full py-2 px-4 rounded-full border border-outline-variant text-on-surface font-medium hover:bg-surface-container transition-colors">Start Trial</button>
</div>
<!-- Creator -->
<div class="flex-1 bg-surface-container-lowest border border-outline-variant rounded-[24px] p-6 flex flex-col">
<h3 class="text-lg font-medium text-on-surface mb-2">Creator</h3>
<div class="text-3xl font-bold text-on-surface mb-6">$99<span class="text-sm font-normal text-on-surface-variant">/mo</span></div>
<p class="text-sm text-on-surface-variant mb-6 flex-grow">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
<button class="w-full py-2 px-4 rounded-full border border-outline-variant text-on-surface font-medium hover:bg-surface-container transition-colors">Start Trial</button>
</div>
<!-- Pro (Emphasized) -->
<div class="flex-1 bg-surface-container border-2 border-primary rounded-[24px] p-6 flex flex-col relative transform lg:-translate-y-4 shadow-md">
<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>
<h3 class="text-lg font-medium text-on-surface mb-2 mt-2">Pro</h3>
<div class="text-3xl font-bold text-on-surface mb-6">$299<span class="text-sm font-normal text-on-surface-variant">/mo</span></div>
<p class="text-sm text-on-surface-variant mb-6 flex-grow">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</p>
<button class="w-full py-2 px-4 rounded-full bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity">Go Pro</button>
</div>
<!-- Enterprise -->
<div class="flex-1 bg-surface-container-lowest border border-outline-variant rounded-[24px] p-6 flex flex-col">
<h3 class="text-lg font-medium text-on-surface mb-2">Enterprise</h3>
<div class="text-3xl font-bold text-on-surface mb-6">Custom</div>
<p class="text-sm text-on-surface-variant mb-6 flex-grow">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
<button class="w-full py-2 px-4 rounded-full border border-outline-variant text-on-surface font-medium hover:bg-surface-container transition-colors">Contact Sales</button>
</div>
</div>
</section>
<!-- 5. Enterprise Section -->
<section class="max-w-[1280px] mx-auto px-6 mb-[150px] grid grid-cols-1 md:grid-cols-2 gap-12 items-center border-y border-surface-variant py-[80px]">
<div class="flex flex-col space-y-6">
<h2 class="font-h2 text-h2 text-on-surface">Enterprise-grade security and scale</h2>
<p class="font-body text-body text-on-surface-variant">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </p>
<a class="text-sm font-medium text-primary hover:underline inline-flex items-center" href="#">
            Learn about Enterprise <span class="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
</a>
</div>
<div class="grid grid-cols-2 gap-4">
<div class="border border-outline-variant rounded-xl p-6 bg-surface-container-lowest flex flex-col items-center justify-center text-center h-32">
<span class="font-bold text-on-surface mb-1 text-lg">SOC 2 Type II</span>
<span class="text-xs text-on-surface-variant">Certified</span>
</div>
<div class="border border-outline-variant rounded-xl p-6 bg-surface-container-lowest flex flex-col items-center justify-center text-center h-32">
<span class="font-bold text-on-surface mb-1 text-lg">GDPR</span>
<span class="text-xs text-on-surface-variant">Compliant</span>
</div>
<div class="border border-outline-variant rounded-xl p-6 bg-surface-container-lowest flex flex-col items-center justify-center text-center h-32">
<span class="font-bold text-on-surface mb-1 text-lg">HIPAA</span>
<span class="text-xs text-on-surface-variant">Ready</span>
</div>
<div class="border border-outline-variant rounded-xl p-6 bg-surface-container-lowest flex flex-col items-center justify-center text-center h-32">
<span class="font-bold text-on-surface mb-1 text-lg">99.99%</span>
<span class="text-xs text-on-surface-variant">Uptime SLA</span>
</div>
</div>
</section>
</main>
<!-- Footer -->
<footer class="w-full border-t border-surface-variant bg-surface-bright pt-24 pb-12">
<div class="max-w-[1280px] mx-auto px-6 mb-20 text-center">
<h2 class="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface mb-8">Ready to build?</h2>
<button class="bg-primary text-on-primary font-button text-lg px-8 py-4 rounded-full hover:opacity-90 transition-opacity active:scale-95 duration-200">
            Get Started with Auralis
        </button>
</div>
<div class="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-16">
<!-- Brand Column -->
<div class="col-span-2 md:col-span-4 lg:col-span-2">
<div class="text-2xl font-bold tracking-tighter text-on-surface mb-6">Auralis</div>
<p class="font-body text-body text-sm text-on-surface-variant mb-6 pr-4">
                    Precision-engineered voice infrastructure for the next generation of applications.
                </p>
<div class="flex flex-col space-y-2">
<label class="text-xs font-medium text-on-surface" for="email">Subscribe to updates</label>
<div class="flex">
<input class="bg-surface-container border border-outline-variant text-on-surface text-sm rounded-l-md px-3 py-2 w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" id="email" placeholder="Email address" type="email"/>
<button class="bg-primary text-on-primary px-4 py-2 rounded-r-md text-sm font-medium hover:opacity-90">Join</button>
</div>
</div>
</div>
<!-- Links Column 1 -->
<div>
<h4 class="font-label-caps text-label-caps text-on-surface mb-4">Products</h4>
<ul class="space-y-3 font-body text-xs leading-relaxed text-on-surface-variant">
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Text to Speech</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Speech to Text</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Voice Cloning</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Pricing</a></li>
</ul>
</div>
<!-- Links Column 2 -->
<div>
<h4 class="font-label-caps text-label-caps text-on-surface mb-4">Developers</h4>
<ul class="space-y-3 font-body text-xs leading-relaxed text-on-surface-variant">
<li><a class="text-on-surface underline focus:ring-2 focus:ring-surface-tint" href="#">Documentation</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">API Reference</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Status</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Changelog</a></li>
</ul>
</div>
<!-- Links Column 3 -->
<div>
<h4 class="font-label-caps text-label-caps text-on-surface mb-4">Company</h4>
<ul class="space-y-3 font-body text-xs leading-relaxed text-on-surface-variant">
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">About</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Blog</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Careers</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Contact</a></li>
</ul>
</div>
<!-- Links Column 4 -->
<div>
<h4 class="font-label-caps text-label-caps text-on-surface mb-4">Legal</h4>
<ul class="space-y-3 font-body text-xs leading-relaxed text-on-surface-variant">
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Privacy</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Terms</a></li>
<li><a class="hover:text-on-surface transition-colors focus:ring-2 focus:ring-surface-tint" href="#">Security</a></li>
</ul>
</div>
</div>
<div class="max-w-[1280px] mx-auto px-6 pt-8 border-t border-surface-variant flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
<div class="font-body text-xs leading-relaxed text-outline">
                © 2024 Auralis AI. Precision-engineered voice infrastructure.
            </div>
<div class="flex space-x-4 text-outline">
<a class="hover:text-on-surface transition-colors" href="#"><span class="material-symbols-outlined text-[20px]">language</span></a>
<a class="hover:text-on-surface transition-colors" href="#"><span class="material-symbols-outlined text-[20px]">chat</span></a>
</div>
</div>
</footer>
</body></html>