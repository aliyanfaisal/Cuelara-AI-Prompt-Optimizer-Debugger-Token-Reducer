"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, Code2, ShieldCheck, Sparkles, Terminal, ChevronDown, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-grid-pattern relative">
      
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-primary/10 blur-[120px] dark:blur-[150px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-accent/10 blur-[100px] dark:blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

      {/* 1. Hero Section */}
      <section className="w-full relative pt-28 pb-16 md:pt-48 md:pb-24 flex flex-col items-center text-center z-10 px-4">
        
        {/* Floating Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block z-0">
          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[12%] w-16 h-16 bg-primary/10 rounded-2xl backdrop-blur-md border border-primary/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] flex items-center justify-center -rotate-12"
          >
            <Sparkles className="w-6 h-6 text-primary/50" />
          </motion.div>
          
          <motion.div
            animate={{ y: [0, 20, 0], rotate: [0, -15, 5, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[20%] right-[15%] w-20 h-20 bg-accent/10 rounded-full backdrop-blur-md border border-accent/20 shadow-[0_0_40px_rgba(236,72,153,0.15)] flex items-center justify-center rotate-12"
          >
            <Code2 className="w-8 h-8 text-accent/50" />
          </motion.div>
          
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 10, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
            className="absolute bottom-[25%] left-[8%] w-12 h-12 bg-blue-500/10 rounded-xl backdrop-blur-md border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center justify-center rotate-45"
          >
            <Terminal className="w-5 h-5 text-blue-500/50 -rotate-45" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 15, 0], rotate: [0, -10, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-[30%] right-[10%] w-16 h-16 bg-emerald-500/10 rounded-2xl backdrop-blur-md border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center justify-center rotate-6"
          >
            <ShieldCheck className="w-6 h-6 text-emerald-500/50" />
          </motion.div>

          <motion.div
            animate={{ y: [0, -25, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-[45%] left-[5%] w-14 h-14 bg-amber-500/10 rounded-full backdrop-blur-md border border-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex items-center justify-center"
          >
            <Zap className="w-5 h-5 text-amber-500/50" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute top-[60%] right-[5%] w-10 h-10 bg-violet-500/10 rounded-lg backdrop-blur-sm border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] flex items-center justify-center -rotate-12"
          >
            <div className="w-2 h-2 bg-violet-500/40 rounded-full" />
          </motion.div>

          {/* Additional new elements */}
          <motion.div
            animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className="absolute top-[8%] right-[30%] w-8 h-8 bg-orange-500/10 rounded-full backdrop-blur-sm border border-orange-500/20 flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
          </motion.div>

          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute top-[65%] left-[25%] w-12 h-12 bg-pink-500/5 rounded-2xl backdrop-blur-sm border border-pink-500/20 flex items-center justify-center rotate-12"
          >
            <div className="w-4 h-4 rounded-full border border-pink-500/30" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 25, 0], rotate: [0, -20, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.1 }}
            className="absolute bottom-[15%] right-[25%] w-10 h-10 bg-teal-500/10 rounded-lg backdrop-blur-sm border border-teal-500/20 flex items-center justify-center -rotate-6"
          >
            <div className="w-2 h-2 bg-teal-500/30 rounded-sm" />
          </motion.div>

          <motion.div
            animate={{ y: [0, -10, 0], x: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
            className="absolute top-[28%] left-[28%] w-6 h-6 bg-yellow-500/10 rounded-full backdrop-blur-sm border border-yellow-500/20 flex items-center justify-center"
          >
            <div className="w-1 h-1 bg-yellow-500/50 rounded-full" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8 shadow-sm"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span>The professional AI prompt toolkit</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-5xl text-4xl sm:text-6xl md:text-8xl font-extrabold tracking-tight mb-8 text-foreground leading-tight"
        >
          Better prompts. <br className="hidden sm:block" />
          <span className="text-gradient-primary">Fewer tokens.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-lg text-muted-foreground md:text-xl mb-12 leading-relaxed"
        >
          Stop wasting API costs on bloated prompts. Cuelara optimizes your instructions for maximum AI understanding, structural clarity, and token efficiency.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-row justify-center flex-wrap gap-3 sm:gap-5 w-full max-w-sm sm:max-w-none"
        >
          <Link
            href="/tools"
            className="inline-flex h-12 sm:h-14 items-center justify-center rounded-full bg-foreground px-5 sm:px-8 text-sm sm:text-base font-bold text-background shadow-lg transition-all hover:scale-105 active:scale-95 hover:shadow-xl w-full sm:w-auto flex-1 sm:flex-none"
          >
            Start Optimizing
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
          <Link
            href="/cookbook"
            className="inline-flex h-12 sm:h-14 items-center justify-center rounded-full border border-border bg-background/50 backdrop-blur-md px-5 sm:px-8 text-sm sm:text-base font-medium text-foreground transition-all hover:bg-accent/5 hover:border-accent/20 shadow-sm w-full sm:w-auto flex-1 sm:flex-none"
          >
            Explore Cookbook
            <Terminal className="ml-2 h-4 w-4 sm:h-5 sm:w-5 opacity-70" />
          </Link>
        </motion.div>

        {/* Animated Code/Preview Element */}
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.7, delay: 0.4 }}
           className="mt-20 w-full max-w-4xl relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl blur-xl" />
          <PromptDemo />
        </motion.div>
      </section>

      {/* 2. Social Proof / Trusted By */}
      <section className="w-full py-8 md:py-12 border-y border-border bg-muted/20 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6 md:mb-8">Trusted by developers building with</p>
          <div className="grid grid-cols-3 justify-items-center sm:flex sm:flex-wrap sm:justify-center items-center gap-6 sm:gap-12 md:gap-20 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            {/* OpenAI */}
            <div className="flex items-center gap-2 group">
              <svg fill="currentColor" className="w-8 h-8 group-hover:text-[#10a37f] transition-colors" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><title>OpenAI icon</title><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"></path></g></svg>
              <span className="text-xl font-bold font-sans tracking-tight hidden sm:block">OpenAI</span>
            </div>
            
            {/* Claude */}
            <div className="flex items-center gap-2 group">
              <svg className="w-8 h-8" fill="#D97757" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Claude</title><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>
              <span className="text-xl font-bold font-serif tracking-tight hidden sm:block">Claude</span>
            </div>
            
            {/* Gemini */}
            <div className="flex items-center gap-2 group">
              <svg className="w-8 h-8" viewBox="0 0 296 298" xmlns="http://www.w3.org/2000/svg" width="296" height="298" fill="none"><mask id="a" width="296" height="298" x="0" y="0" maskUnits="userSpaceOnUse" style={{maskType: "alpha"}}><path fill="#3186FF" d="M141.201 4.886c2.282-6.17 11.042-6.071 13.184.148l5.985 17.37a184.004 184.004 0 0 0 111.257 113.049l19.304 6.997c6.143 2.227 6.156 10.91.02 13.155l-19.35 7.082a184.001 184.001 0 0 0-109.495 109.385l-7.573 20.629c-2.241 6.105-10.869 6.121-13.133.025l-7.908-21.296a184 184 0 0 0-109.02-108.658l-19.698-7.239c-6.102-2.243-6.118-10.867-.025-13.132l20.083-7.467A183.998 183.998 0 0 0 133.291 26.28l7.91-21.394Z"/></mask><g mask="url(#a)"><g filter="url(#b)"><ellipse cx="163" cy="149" fill="#3689FF" rx="196" ry="159"/></g><g filter="url(#c)"><ellipse cx="33.5" cy="142.5" fill="#F6C013" rx="68.5" ry="72.5"/></g><g filter="url(#d)"><ellipse cx="19.5" cy="148.5" fill="#F6C013" rx="68.5" ry="72.5"/></g><g filter="url(#e)"><path fill="#FA4340" d="M194 10.5C172 82.5 65.5 134.333 22.5 135L144-66l50 76.5Z"/></g><g filter="url(#f)"><path fill="#FA4340" d="M190.5-12.5C168.5 59.5 62 111.333 19 112L140.5-89l50 76.5Z"/></g><g filter="url(#g)"><path fill="#14BB69" d="M194.5 279.5C172.5 207.5 66 155.667 23 155l121.5 201 50-76.5Z"/></g><g filter="url(#h)"><path fill="#14BB69" d="M196.5 320.5C174.5 248.5 68 196.667 25 196l121.5 201 50-76.5Z"/></g></g><defs><filter id="b" width="464" height="390" x="-69" y="-46" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="18"/></filter><filter id="c" width="265" height="273" x="-99" y="6" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="d" width="265" height="273" x="-113" y="12" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="e" width="299.5" height="329" x="-41.5" y="-130" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="f" width="299.5" height="329" x="-45" y="-153" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="g" width="299.5" height="329" x="-41" y="91" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="h" width="299.5" height="329" x="-39" y="132" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter></defs></svg>
              <span className="text-xl font-bold font-sans tracking-tight hidden sm:block">Gemini</span>
            </div>
            
            {/* Meta */}
            <div className="flex items-center gap-2 group">
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>MetaAI</title>
                <g clipPath="" filter="">
                  <path
                    clipRule="evenodd"
                    d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm0 3.627a8.373 8.373 0 100 16.746 8.373 8.373 0 000-16.746z"
                    fill="url(#grad-c)"
                    fillRule="evenodd"
                  />
                </g>
                <defs>
                  <linearGradient gradientUnits="userSpaceOnUse" id="grad-c" x1="24" x2="0" y1="0" y2="24">
                    <stop offset=".13" stopColor="#FF97E3" />
                    <stop offset=".18" stopColor="#D14FE1" />
                    <stop offset=".338" stopColor="#0050E2" />
                    <stop offset=".666" stopColor="#0050E2" />
                    <stop offset=".809" stopColor="#00DDF4" />
                    <stop offset=".858" stopColor="#23F8CC" />
                  </linearGradient>
                  <clipPath id="grad-a">
                    <path d="M0 0h24v24H0z" fill="#fff" />
                  </clipPath>
                  <filter
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                    height="24"
                    id="grad-b"
                    width="24"
                    x="0"
                    y="0"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feColorMatrix
                      in="SourceAlpha"
                      result="hardAlpha"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    />
                    <feOffset />
                    <feGaussianBlur stdDeviation=".75" />
                    <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                    <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
                    <feBlend in2="shape" result="effect1_innerShadow_674_237" />
                  </filter>
                </defs>
              </svg>
              <span className="text-xl font-bold font-sans tracking-tighter hidden sm:block">Meta</span>
            </div>

            {/* Mistral */}
            <div className="flex items-center gap-2 group">
              <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Mistral</title><path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" fill="gold" /><path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" fill="#FFAF00" /><path d="M3.428 10.258h17.144v3.428H3.428v-3.428z" fill="#FF8205" /><path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z" fill="#FA500F" /><path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" fill="#E10500" /></svg>
              <span className="text-xl font-bold font-sans tracking-tight hidden sm:block">Mistral</span>
            </div>

            {/* Cohere */}
            <div className="flex items-center gap-2 group">
              <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" style={{enableBackground:"new 0 0 75 75"}} viewBox="0 0 75 75"><path d="M24.3 44.7c2 0 6-.1 11.6-2.4 6.5-2.7 19.3-7.5 28.6-12.5 6.5-3.5 9.3-8.1 9.3-14.3C73.8 7 66.9 0 58.3 0h-36C10 0 0 10 0 22.3s9.4 22.4 24.3 22.4z" style={{fillRule:"evenodd", clipRule:"evenodd", fill:"#39594d"}}/><path d="M30.4 60c0-6 3.6-11.5 9.2-13.8l11.3-4.7C62.4 36.8 75 45.2 75 57.6 75 67.2 67.2 75 57.6 75H45.3c-8.2 0-14.9-6.7-14.9-15z" style={{fillRule:"evenodd", clipRule:"evenodd", fill:"#d18ee2"}}/><path d="M12.9 47.6C5.8 47.6 0 53.4 0 60.5v1.7C0 69.2 5.8 75 12.9 75c7.1 0 12.9-5.8 12.9-12.9v-1.7c-.1-7-5.8-12.8-12.9-12.8z" style={{fill:"#ff7759"}}/></svg>
              <span className="text-xl font-bold font-sans tracking-tight hidden sm:block">Cohere</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section className="w-full py-16 md:py-32 relative z-10 border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-4 md:mb-6 tracking-tight">The Complete Prompt Toolkit</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">Everything you need to write production-ready, highly efficient AI instructions without the guesswork.</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <FeatureCard 
              href="/tools/token-optimizer"
              icon={<Zap className="h-6 w-6 text-amber-500" />}
              title="Token Optimizer"
              description="Reduce prompt token usage by up to 50% without sacrificing meaning, saving you thousands on API costs."
            />
            <FeatureCard 
              href="/tools/prompt-optimizer"
              icon={<Code2 className="h-6 w-6 text-primary" />}
              title="Prompt Optimizer"
              description="Rewrites your messy instructions for maximum AI understanding. Tailored modes for coding, writing, and business."
            />
            <FeatureCard 
              href="/tools/prompt-debugger"
              icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
              title="Prompt Debugger"
              description="Automatically detects vague wording, contradictory constraints, and missing context before you hit send."
            />
            <FeatureCard 
              href="/tools/prompt-formatter"
              icon={<Terminal className="h-6 w-6 text-pink-500" />}
              title="Prompt Formatter"
              description="Instantly converts unstructured walls of text into standardized, model-friendly sections (Role, Task, Constraints)."
            />
            <FeatureCard 
              href="/tools/intelligence-score"
              icon={<Sparkles className="h-6 w-6 text-violet-500" />}
              title="Intelligence Score"
              description="Get a 1-100 score analyzing your prompt's clarity, specificity, and AI-readiness with actionable suggestions."
            />
            <FeatureCard 
              href="/tools/compare-estimate"
              icon={<ArrowRight className="h-6 w-6 text-blue-500" />}
              title="Compare & Estimate"
              description="Visual diffs showing exactly what changed, alongside precise token and API cost estimations."
            />
            </motion.div>
        </div>
      </section>

      {/* 4. How It Works (Step by Step) */}
      <section className="w-full py-16 md:py-32 relative z-10 border-b border-border bg-muted/10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col-reverse md:flex-row items-center gap-12 md:gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="flex-1 space-y-6 md:space-y-8"
            >
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground tracking-tight">From messy thoughts to precise instructions in seconds.</h2>
              <p className="text-base md:text-lg text-muted-foreground">Writing good prompts is hard. Cuelara acts as your AI engineering co-pilot, formatting your brain-dumps into professional system instructions.</p>
              
              <div className="space-y-6 pt-2 md:pt-4">
                <Step number="1" title="Paste your raw idea" desc="Don't worry about formatting or being concise. Just dump your requirements." />
                <Step number="2" title="Cuelara analyzes and optimizes" desc="Our engine detects ambiguities, structures the task, and shreds useless tokens." />
                <Step number="3" title="Deploy and save" desc="Copy the heavily optimized prompt to your codebase and watch your API bills drop." />
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 w-full relative group perspective-1000"
            >
              <div className="relative transform-gpu transition-all duration-500 group-hover:scale-[1.02] group-hover:-rotate-1">
                {/* Subtle outer glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 blur-2xl rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative bg-background/80 backdrop-blur-xl rounded-[2rem] p-10 shadow-2xl border border-border/50 aspect-square max-h-[450px] flex flex-col items-center justify-center overflow-hidden">
                  
                  {/* Subtle inner grid pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />

                  {/* Icon container */}
                  <div className="relative mb-8 z-10">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-primary to-accent p-[2px] shadow-lg transform rotate-3 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                      <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
                        <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Text content */}
                  <div className="text-center z-10">
                    <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-foreground">
                      Automated Optimization
                    </h3>
                    <p className="text-muted-foreground text-base md:text-lg max-w-sm mx-auto leading-relaxed">
                      Powered by advanced heuristics and LLM-assisted analysis.
                    </p>
                  </div>

                  {/* Animated corner accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/40 rounded-tl-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-accent/40 rounded-br-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. FAQ Section */}
      <section className="w-full py-16 md:py-32 relative z-10 border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-base md:text-lg text-muted-foreground">Everything you need to know about Cuelara and prompt optimization.</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <FaqItem 
              question="Why should I care about token usage?" 
              answer="API providers like OpenAI and Anthropic charge by the token. If you have a highly-used application passing a 1,000 token system prompt on every request, reducing that to 500 tokens immediately cuts your API costs in half, while also making the model respond slightly faster."
            />
            <FaqItem 
              question="Does shortening the prompt make the AI dumber?" 
              answer="No! In fact, it often makes it smarter. Long, bloated prompts often confuse LLMs by burying the core instruction in filler words. Cuelara removes the 'fluff' while preserving the exact constraints and requirements, leading to more accurate outputs."
            />
            <FaqItem 
              question="Do I need to pay to use Cuelara?" 
              answer="The core Prompt Optimizer and Debugger are completely free to use. We offer premium plans for teams who need API access, saved prompt workspaces, and advanced multi-model diffing."
            />
            <FaqItem 
              question="What models do you optimize for?" 
              answer="Cuelara generates structurally sound prompts that work excellently across all major frontier models including GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro."
            />
            <FaqItem 
              question="Can I use Cuelara to write prompts from scratch?" 
              answer="Yes! We have a Prompt Formatter tool that takes your loose ideas and automatically structures them into a professional prompt. You can also explore our Cookbook for pre-made, highly optimized templates."
            />
            <FaqItem 
              question="Can it handle complex JSON schemas or code formatting?" 
              answer="Absolutely. Cuelara is heavily optimized for developers. It will preserve your strict JSON structures, XML tags, and code blocks while rewriting the conversational filler around them."
            />
            <FaqItem 
              question="What is the Prompt Intelligence Score?" 
              answer="It's an automated metric (0-100) that analyzes your prompt's clarity, specificity, and how easily an AI model will understand it. A higher score means better, more predictable outputs and fewer hallucinations."
            />
            <FaqItem 
              question="How does the API cost estimation work?" 
              answer="Our engine counts the tokens of your original prompt vs the optimized prompt, and multiplies the savings by the official API pricing (e.g., OpenAI's input token costs) to show exactly how much money you save per 1,000 requests."
            />
            <FaqItem 
              question="Is my prompt data stored securely?" 
              answer="We do not store your prompts or fine-tune models on your data. All optimizations run ephemerally, and your intellectual property remains 100% yours."
            />
          </motion.div>
        </div>
      </section>

      {/* 6. Final CTA */}
      <section className="w-full py-16 md:py-32 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="container mx-auto px-4 text-center relative z-10"
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-4 md:mb-6">Stop guessing. Start optimizing.</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto">
            Join thousands of developers writing highly efficient, structurally perfect AI prompts.
          </p>
          <Link
            href="/tools"
            className="inline-flex w-[90%] sm:w-auto h-12 md:h-14 items-center justify-center rounded-full bg-primary px-6 md:px-10 text-base md:text-lg font-bold text-primary-foreground shadow-xl transition-all hover:scale-105 active:scale-95 hover:shadow-primary/25"
          >
            Optimize Your First Prompt
            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
          </Link>
        </motion.div>
      </section>

    </div>
  );
}

// -------------------------------------------------------------
// Helper Components
// -------------------------------------------------------------

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode, title: string, description: string, href: string }) {
  return (
    <Link href={href} className="glass-card p-8 rounded-2xl flex flex-col items-start text-left transition-all hover:-translate-y-2 hover:border-primary/20 hover:shadow-xl group relative overflow-hidden h-full">
      <div className="p-4 bg-background/50 rounded-xl border border-border mb-6 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="flex flex-wrap items-center mb-3">
        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mr-3">{title}</h3>
        {/* Animated Arrow */}
        <div className="flex items-center text-sm font-bold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          Try out <ArrowRight className="ml-1 h-4 w-4" />
        </div>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20">
        {number}
      </div>
      <div>
        <h4 className="text-xl font-bold text-foreground mb-1">{title}</h4>
        <p className="text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden glass transition-colors hover:bg-muted/30">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full text-left px-4 py-4 md:px-6 md:py-5 flex items-center justify-between font-bold text-base md:text-lg focus:outline-none"
      >
        {question}
        <ChevronDown className={`w-5 h-5 flex-shrink-0 ml-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------
// Animated Demo Component
// -------------------------------------------------------------

const DEMO_EXAMPLES = [
  {
    file: "react-auth.tsx",
    before: '"Hi AI, I was wondering if you could please help me write a new React authentication component from scratch? I am very new to this and I really need it to use TypeScript and also JSON Web Tokens for security. Please make it good and explain it to me. Thanks so much!"',
    after: '"Create a React auth component (TypeScript + JWT)."',
    tokenSaved: "52% Fewer Tokens",
    gain: "+ Clarity",
  },
  {
    file: "debug-db.sql",
    before: '"Can you look at this code below and tell me what is wrong with the database connection pool? It keeps crashing my server in production and throwing timeout errors when there are too many users online. I do not know how to fix it, please rewrite the pool logic."',
    after: '"Debug this Postgres connection pool (Fixes production timeout errors). Return only code."',
    tokenSaved: "45% Fewer Tokens",
    gain: "+ Structure",
  },
  {
    file: "generate-blog.md",
    before: '"Please write a really long and detailed blog post about how artificial intelligence can be used to optimize prompts. I want it to sound very professional but also engaging so that software developers will want to read it and share it with their friends on Twitter and LinkedIn."',
    after: '"Write a technical blog post on AI prompt optimization. Tone: Professional. Audience: Senior Engineers."',
    tokenSaved: "48% Fewer Tokens",
    gain: "+ Precision",
  }
];

function PromptDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DEMO_EXAMPLES.length);
    }, 4500); 
    return () => clearInterval(timer);
  }, []);

  const current = DEMO_EXAMPLES[currentIndex];

  return (
    <div className="glass-card w-full rounded-2xl overflow-hidden text-left relative z-10 shadow-2xl">
      <div className="flex items-center px-4 py-3 border-b border-border/50 bg-muted/80 backdrop-blur-md">
        <div className="flex gap-2 w-20">
          <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20" />
          <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/20" />
          <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20" />
        </div>
        
        <div className="flex-1 flex justify-center gap-2 overflow-hidden">
          {DEMO_EXAMPLES.map((example, idx) => (
            <div 
              key={idx}
              className={`text-xs font-mono px-3 py-1 rounded-md transition-all duration-300 ${
                idx === currentIndex 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hidden sm:block"
              }`}
            >
              {example.file}
            </div>
          ))}
        </div>
        
        <div className="w-20" /> 
      </div>

      <div className="p-6 md:p-8 font-mono text-sm sm:text-base leading-loose min-h-[220px] flex flex-col justify-center bg-background/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-6"
          >
            <div className="group">
              <div className="flex items-center text-xs font-bold text-red-500/80 uppercase tracking-wider mb-2">
                <span className="bg-red-500/10 px-2 py-0.5 rounded text-[10px] mr-2">Bloated</span>
                Original Prompt
              </div>
              <div className="text-muted-foreground relative pl-4 border-l-2 border-red-500/30">
                <span className="line-through decoration-red-500/40 text-foreground/80">{current.before}</span>
                <span className="inline-flex items-center ml-3 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold whitespace-nowrap">
                  {current.tokenSaved}
                </span>
              </div>
            </div>

            <div className="group">
              <div className="flex items-center text-xs font-bold text-green-500 uppercase tracking-wider mb-2">
                <span className="bg-green-500/10 px-2 py-0.5 rounded text-[10px] mr-2">Optimized</span>
                Cuelara Output
              </div>
              <div className="text-foreground relative pl-4 border-l-2 border-green-500/50">
                <span className="text-primary font-medium">{current.after}</span>
                <span className="inline-flex items-center ml-3 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold whitespace-nowrap">
                  {current.gain}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
