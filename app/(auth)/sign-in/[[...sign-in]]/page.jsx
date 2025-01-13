import { SignIn } from "@clerk/nextjs";

const SigninPage = () => {
  return (
    <div className="flex w-full items-start justify-center p-3">
      <SignIn />
    </div>
  );
};

export default SigninPage;
