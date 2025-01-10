import Link from "next/link";
import Image from "next/image";
// IMAGES
import homeTeamImage from "@/assets/images/home/home_team.png";
import homeAthleteImage from "@/assets/images/home/home_athlete.png";
import homeCompetitorImage from "@/assets/images/home/home_competitor.png";

const HomePage = () => {
  return (
    <div className="items-center justify-items-start min-h-screen p-1 pb-20 gap-16 sm:p-10">
      <div className="flex flex-col gap-8 row-start-2 items-start sm:items-start text-center">
        <h1 className="w-full text-3xl text-center font-bold">
          MatScout: Your Ultimate Grappling Hub
        </h1>
        <p className="text-center w-full text-2xl">
          Discover the premier platform for athletes and coaches alike. Whether
          you’re an international-level competitor or a local athlete, MatScout
          empowers you and your coach to track performance, connect with fellow
          grapplers, and elevate your game—all in one place
        </p>

        <div className="grid grid-cols-3 gap-10">
          <div>
            <Link href="/">
              <Image
                src={homeTeamImage}
                alt="Team Image"
                className="homeImage"
              />
              <div className="mt-2">
                <h2 className="text-start w-full text-2xl font-bold">
                  Coaches
                </h2>
                <p className="text-start w-full text-xl">
                  Manage multiple teams effortlessly. Access all your athletes
                  in one centralized location. Stay organized and elevate your
                  coaching game with MatScout’s intuitive team management
                  features.
                </p>
              </div>
            </Link>
          </div>
          <div className="home-jump flex align-items-start home-desc">
            <Link href="/">
              <Image
                src={homeAthleteImage}
                alt="Athletes Image"
                className="homeImage"
              />
              <div className="mt-2">
                <h2 className="text-start w-full text-2xl font-bold">
                  Athletes
                </h2>
                <p className="text-start w-full text-xl">
                  Keep a comprehensive record of all your matches in one
                  convenient location. Dive into performance analysis to
                  identify strengths and areas for improvement. Elevate your
                  grappling game with MatScout!
                </p>
              </div>
            </Link>
          </div>
          <div className="home-jump flex align-items-start home_desc">
            <Link href="/">
              <Image
                src={homeCompetitorImage}
                alt="Competitors Image"
                className="homeImage"
              />
              <div className="mt-2">
                <h2 className="text-start w-full text-2xl font-bold">
                  Everyone
                </h2>
                <p className="text-start w-full text-xl">
                  Engage with our vibrant community, enjoy a secure and private
                  experience, and explore our user-friendly platform. Whether
                  you’re a seasoned enthusiast or new to the sport, MatScout has
                  something for everyone!
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
