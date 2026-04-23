import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

const VerificationSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Get email from URL search params
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Xác thực email thành công!</CardTitle>
          <CardDescription>
            Tài khoản của bạn đã được xác thực thành công
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">
            Email <span className="font-medium">{email}</span> của bạn đã được xác thực.
            Bạn có thể đăng nhập và sử dụng đầy đủ các tính năng của ứng dụng.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate("/auth?tab=login")} className="w-full">
            Đăng nhập ngay
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerificationSuccess; 