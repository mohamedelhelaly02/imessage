FROM mcr.microsoft.com/dotnet/sdk:10.0 AS development
WORKDIR /src
COPY Api.csproj ./
RUN dotnet restore Api.csproj
COPY . .
EXPOSE 8080
CMD ["dotnet", "watch", "--no-hot-reload", "run", "--no-launch-profile", "--urls=http://0.0.0.0:8080"]

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Api.csproj ./
RUN dotnet restore Api.csproj
COPY . .
RUN dotnet publish Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS production
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Api.dll"]
