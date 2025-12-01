FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/WebApp.API/WebApp.API.csproj", "src/WebApp.API/"]
COPY ["src/WebApp.Core/WebApp.Core.csproj", "src/WebApp.Core/"]
COPY ["src/WebApp.Infrastructure/WebApp.Infrastructure.csproj", "src/WebApp.Infrastructure/"]
RUN dotnet restore "src/WebApp.API/WebApp.API.csproj"
COPY . .
WORKDIR "/src/src/WebApp.API"
RUN dotnet build "WebApp.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "WebApp.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "WebApp.API.dll"]



