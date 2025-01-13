import { SignUp } from "@clerk/nextjs";

const SignupPage = () => {
  return (
    <div className="flex w-full items-start justify-center p-3">
      <SignUp />
    </div>
  );
};

export default SignupPage;
