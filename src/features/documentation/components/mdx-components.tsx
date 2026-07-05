import { CodeTabs, CodeTab } from "@/features/documentation/components/mdx/CodeTabs";
import { CodeBlockWrapper } from "@/features/documentation/components/mdx/CodeBlockWrapper";
import { Terminal } from "@/features/documentation/components/mdx/Terminal";
import { Steps, Step } from "@/features/documentation/components/mdx/Steps";
import Alert from "@/features/documentation/components/mdx/Alert";
import { MdxIcon } from "@/features/documentation/components/mdx/MdxIcon";
import { Accordion, AccordionItem } from "@/features/documentation/components/mdx/Accordion";
import { Carousel } from "@/features/documentation/components/mdx/Carousel";
import { ZoomImage } from "@/features/documentation/components/mdx/ZoomImage";
import { Video, Audio } from "@/features/documentation/components/mdx/Media";
import { GithubRepo } from "@/features/documentation/components/mdx/GithubRepo";
import { FileTree, Folder, File } from "@/features/documentation/components/mdx/FileTree";
import PropertyTable from "@/features/documentation/components/mdx/PropertyTable";
import { Hero } from "@/features/documentation/components/mdx/Hero";
import { Badge } from "@/features/documentation/components/mdx/Badge";
import { CodeExplainer, CodeExplainerFile, CodeExplainerStep } from "@/features/documentation/components/mdx/CodeExplainer";
import { CodeEmbed } from "@/features/documentation/components/mdx/CodeEmbed";
import { BentoGrid, BentoCard } from "@/features/documentation/components/mdx/BentoGrid";
import { Timeline, TimelineItem } from "@/features/documentation/components/mdx/Timeline";
import { FeatureGlowGrid, FeatureGlowCard } from "@/features/documentation/components/mdx/FeatureGlow";
import { Roadmap, RoadmapItem } from "@/features/documentation/components/mdx/Roadmap";
import { Tooltip } from "@/features/documentation/components/mdx/Tooltip";
import { Kbd } from "@/features/documentation/components/mdx/Kbd";
import { TextReveal } from "@/features/documentation/components/mdx/TextReveal";
import { AnimatedSVG } from "@/features/documentation/components/mdx/AnimatedSVG";
import { TimelineFlow } from "@/features/documentation/components/mdx/TimelineFlow";
import { X6Diagram } from "@/features/documentation/components/mdx/X6Diagram";
import { P5Sketch } from "@/features/documentation/components/mdx/P5Sketch";
import { JSXGraphBoard } from "@/features/documentation/components/mdx/JSXGraphBoard";
import {
  MafsBoard,
  MafsCoordinates,
  MafsPlot,
  MafsPoint,
} from "@/features/documentation/components/mdx/MafsComponents";
import { LatexBlock, LatexInline } from "@/features/documentation/components/mdx/Latex";

import { Mermaid } from "@/features/documentation/components/mdx/Mermaid";

export const mdxComponents = {
  iframe: (props: any) => {
    const { frameborder, allowfullscreen, referrerpolicy, ...rest } = props;
    return (
      <iframe 
        frameBorder={frameborder} 
        allowFullScreen={allowfullscreen === "true" || allowfullscreen === true || allowfullscreen === ""} 
        referrerPolicy={referrerpolicy}
        {...rest} 
      />
    );
  },
  img: ZoomImage,
  Mermaid,
  mermaid: Mermaid,
  CodeTabs,
  CodeTab,
  Terminal,
  Steps,
  Step,
  CodeBlockWrapper,
  Alert,
  Accordion,
  AccordionItem,
  Carousel,
  ZoomImage,
  Video,
  Audio,
  GithubRepo,
  FileTree,
  Folder,
  File,
  PropertyTable,
  PropertyGrid: PropertyTable,
  Hero,
  Badge,
  CodeEmbed,
  BentoGrid,
  BentoCard,
  Timeline,
  TimelineItem,
  FeatureGlowGrid,
  FeatureGlowCard,
  Roadmap,
  RoadmapItem,
  Tooltip,
  Kbd,
  X6Diagram,
  P5Sketch,
  JSXGraphBoard,

  // Aliases
  icon: MdxIcon,
  Icon: MdxIcon,
  accordion: Accordion,
  accordionitem: AccordionItem,
  carousel: Carousel,
  zoomimage: ZoomImage,
  video: Video,
  audio: Audio,
  github: GithubRepo,
  repo: GithubRepo,
  Github: GithubRepo,
  tabs: CodeTabs,
  tab: CodeTab,
  terminal: Terminal,
  steps: Steps,
  step: Step,
  alert: Alert,
  filetree: FileTree,
  folder: Folder,
  file: File,
  props: PropertyTable,
  propGrid: PropertyTable,
  hero: Hero,
  badge: Badge,
  CodeExplainer,
  CodeExplainerFile,
  CodeExplainerStep,
  codeexplainer: CodeExplainer,
  codeexplainerfile: CodeExplainerFile,
  codeexplainerstep: CodeExplainerStep,
  embed: CodeEmbed,
  codepen: CodeEmbed,
  sandbox: CodeEmbed,
  stackblitz: CodeEmbed,
  bentogrid: BentoGrid,
  bentocard: BentoCard,
  timeline: Timeline,
  timelineitem: TimelineItem,
  FeatureGlow: FeatureGlowGrid,
  featureglow: FeatureGlowGrid,
  featureglowcard: FeatureGlowCard,
  roadmap: Roadmap,
  roadmapitem: RoadmapItem,
  tooltip: Tooltip,
  kbd: Kbd,
  TextReveal,
  AnimatedSVG,
  TimelineFlow,
  textreveal: TextReveal,
  svgdraw: AnimatedSVG,
  flow: TimelineFlow,
  X6: X6Diagram,
  sketch: P5Sketch,
  Sketch: P5Sketch,
  JSXGraph: JSXGraphBoard,
  jsxgraph: JSXGraphBoard,
  MafsBoard,
  MafsCoordinates,
  MafsPlot,
  MafsPoint,
  LatexBlock,
  Latex: LatexBlock,
  LatexInline,
  Math: LatexBlock,
  MathInline: LatexInline,
  animatedsvg: AnimatedSVG,
  timelineflow: TimelineFlow,
  x6diagram: X6Diagram,
};
