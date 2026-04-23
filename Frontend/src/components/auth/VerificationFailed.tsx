import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const VerificationFailed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>("Không thể xác thực email của bạn");

  useEffect(() => {
    // Get error from URL search params
    const searchParams = new URLSearchParams(location.search);
    const errorParam = searchParams.get("error");
    if (errorParam) {
      try {
        // Nếu error message là JSON string, parse nó
        const decodedError = decodeURIComponent(errorParam);
        setError(decodedError);
      } catch (err) {
        console.error("Error parsing error message:", err);
        setError("Có lỗi xảy ra trong quá trình xác thực email");
      }
    }
  }, [location]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Xác thực thất bại</CardTitle>
          <CardDescription>
            Chúng tôi không thể xác thực email của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-red-600">
            {error}
          </p>
          <p>
            Lỗi này có thể do link xác thực đã hết hạn hoặc đã được sử dụng.
            Bạn có thể thử đăng nhập và yêu cầu gửi lại email xác thực.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center space-x-2">
          <Button onClick={() => navigate("/auth?tab=login")} variant="outline" className="w-1/2">
            Đăng nhập
          </Button>
          <Button onClick={() => navigate("/auth?tab=register")} className="w-1/2">
            Đăng ký
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerificationFailed; 