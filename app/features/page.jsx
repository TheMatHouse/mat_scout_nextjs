// "use client";

// import Image from "next/image";
// import PerformanceRed from "@/assets/images/icons/performance-red.png";
// import AthleteRed from "@/assets/images/icons/athlete-red.png";
// import MatchRed from "@/assets/images/icons/match-red.png";
// import TeamRed from "@/assets/images/icons/team-red.png";
// import TrophyRed from "@/assets/images/icons/trophy-red.png";
// import DataRed from "@/assets/images/icons/data-red.png";

// export default function FeaturesPage() {
//   return (
//     <div className="px-4 sm:px-8 md:px-12 lg:px-24 py-12 max-w-7xl mx-auto text-white">
//       <h1 className="text-4xl font-bold text-center mb-12">Features</h1>

//       {/* FOR ATHLETES */}
//       <section
//         id="athletes"
//         className="mb-16"
//       >
//         <h2 className="text-3xl font-semibold text-center mb-10">
//           For Athletes
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
//           <FeatureCard
//             imgSrc={PerformanceRed}
//             title="Competitor Analysis"
//             description="Compare your stats with other grapplers. Understand your strengths and identify areas for improvement."
//           />
//           <FeatureCard
//             imgSrc={AthleteRed}
//             title="Performance Tracking"
//             description="Keep track of your match outcomes, techniques used, and progression in one place. Record your stats after each match and monitor your growth over time."
//           />
//           <FeatureCard
//             imgSrc={MatchRed}
//             title="Team Collaboration"
//             description="Join a team, share your stats, and collaborate with teammates. Together, you can strategize and improve as a cohesive unit."
//           />
//         </div>
//       </section>

//       {/* FOR COACHES */}
//       <section
//         id="coaches"
//         className="mb-16"
//       >
//         <h2 className="text-3xl font-semibold text-center mb-10">
//           For Coaches
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
//           <FeatureCard
//             imgSrc={TeamRed}
//             title="Team Management"
//             description="Manage your team on a single platform. Add or remove athletes, scout other athletes, set goals, and monitor progress."
//           />
//           <FeatureCard
//             imgSrc={TrophyRed}
//             title="Athlete Monitoring"
//             description="Keep an eye on each athlete's performance. Identify trends, celebrate improvements, and address declines."
//           />
//           <FeatureCard
//             imgSrc={DataRed}
//             title="Data-Driven Decisions"
//             description="Make informed decisions based on data. Use our analytics tools to understand your athlete or team's performance and plan your next steps."
//           />
//         </div>
//       </section>

//       {/* FOR EVERYONE */}
//       <section
//         id="everyone"
//         className="mb-16"
//       >
//         <h2 className="text-3xl font-semibold text-center mb-10">
//           For Everyone
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
//           <FeatureCard
//             imgSrc={PerformanceRed}
//             title="User-Friendly Interface"
//             description="Our platform is easy to use, with a clean and intuitive interface."
//           />
//           <FeatureCard
//             imgSrc={AthleteRed}
//             title="Secure and Private"
//             description="We prioritize your privacy and security. Your data is safe with us."
//           />
//           <FeatureCard
//             imgSrc={MatchRed}
//             title="Community"
//             description="Join a community of grapplers, coaches, and sports enthusiasts. Share your journey, learn from others, and make new friends."
//           />
//         </div>
//       </section>

//       <p className="text-center text-lg font-medium mt-10">
//         Join us at MatScout and take your grappling journey to the next level!
//       </p>
//     </div>
//   );
// }

// function FeatureCard({ imgSrc, title, description }) {
//   return (
//     <div className="bg-[#1c1c27] rounded-xl shadow p-6 text-center h-full">
//       <Image
//         src={imgSrc}
//         alt={title}
//         className="mx-auto h-20 w-20 mb-4"
//       />
//       <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
//       <p className="text-sm text-gray-300">{description}</p>
//     </div>
//   );
// }

"use client";

import Image from "next/image";
import PerformanceRed from "@/assets/images/icons/performance-red.png";
import AthleteRed from "@/assets/images/icons/athlete-red.png";
import MatchRed from "@/assets/images/icons/match-red.png";
import TeamRed from "@/assets/images/icons/team-red.png";
import TrophyRed from "@/assets/images/icons/trophy-red.png";
import DataRed from "@/assets/images/icons/data-red.png";
import { useEffect } from "react";

export default function FeaturesPage() {
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        window.scrollTo({
          top: el.offsetTop - 120, // Offset for sticky header
          behavior: "smooth",
        });
      }
    }
  }, []);

  return (
    <div className="px-4 sm:px-8 md:px-12 lg:px-24 py-12 max-w-screen-xl mx-auto text-gray-900 dark:text-white">
      <h1 className="text-4xl font-bold text-center mb-4">Features</h1>
      <p className="text-center text-muted-foreground mb-12">
        Explore what MatScout has to offer for athletes, coaches, and the entire
        community.
      </p>

      {/* FOR ATHLETES */}
      <section
        id="athletes"
        className="mb-16"
      >
        <h2 className="text-3xl font-semibold text-center mb-10">
          For Athletes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <FeatureCard
            imgSrc={PerformanceRed}
            title="Competitor Analysis"
            description="Compare your stats with other grapplers. Understand your strengths and identify areas for improvement."
          />
          <FeatureCard
            imgSrc={AthleteRed}
            title="Performance Tracking"
            description="Track your match outcomes, techniques used, and progression in one place. Monitor your growth over time."
          />
          <FeatureCard
            imgSrc={MatchRed}
            title="Team Collaboration"
            description="Join a team, share stats, and strategize with teammates to improve together."
          />
        </div>
      </section>

      <hr className="my-16 border-t border-border dark:border-white/10" />

      {/* FOR COACHES */}
      <section
        id="coaches"
        className="mb-16"
      >
        <h2 className="text-3xl font-semibold text-center mb-10">
          For Coaches
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <FeatureCard
            imgSrc={TeamRed}
            title="Team Management"
            description="Manage your athletes, scout others, set goals, and track team progress all in one place."
          />
          <FeatureCard
            imgSrc={TrophyRed}
            title="Athlete Monitoring"
            description="Track individual progress, celebrate wins, and step in when performance dips."
          />
          <FeatureCard
            imgSrc={DataRed}
            title="Data-Driven Decisions"
            description="Use real stats and insights to make smarter coaching choices and plan your team's growth."
          />
        </div>
      </section>

      <hr className="my-16 border-t border-border dark:border-white/10" />

      {/* FOR EVERYONE */}
      <section
        id="everyone"
        className="mb-16"
      >
        <h2 className="text-3xl font-semibold text-center mb-10">
          For Everyone
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <FeatureCard
            imgSrc={PerformanceRed}
            title="User-Friendly Interface"
            description="Enjoy a clean and intuitive experience across all devices."
          />
          <FeatureCard
            imgSrc={AthleteRed}
            title="Secure and Private"
            description="Your data is protected with industry-leading privacy and security practices."
          />
          <FeatureCard
            imgSrc={MatchRed}
            title="Community"
            description="Join grapplers, coaches, and fans to share your journey and support each other."
          />
        </div>
      </section>

      <p className="text-center text-lg font-medium mt-10 text-gray-800 dark:text-white/90">
        Join us at MatScout and take your grappling journey to the next level!
      </p>
    </div>
  );
}

function FeatureCard({ imgSrc, title, description }) {
  return (
    <div className="relative bg-[#1c1c27] rounded-xl shadow p-6 text-center h-full overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#ef233c] rounded-t-xl" />
      <Image
        src={imgSrc}
        alt={title}
        className="mx-auto h-20 w-20 mb-4"
      />
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/70">{description}</p>
    </div>
  );
}
